require "test_helper"

class Api::V1::StatsTest < ActionDispatch::IntegrationTest
  setup do
    Rails.cache.clear
    @user = create_user(created_at: 1.month.ago)
    # Addis is UTC+3: 08:30 and 09:00 on two Mondays, then 15:00 that second Monday.
    drink_at shops(:bole), "2026-10-12 05:30:00 UTC", drink: "Macchiato", rating: 5
    drink_at shops(:bole), "2026-10-19 06:00:00 UTC", drink: "macchiato "
    drink_at shops(:piassa), "2026-10-19 12:00:00 UTC", drink: "Buna"
    travel_to Time.utc(2026, 10, 19, 13) do
      CheckIn.record!(user: @user, shop: shops(:piassa), idempotency_key: "far", latitude: 9.2, longitude: 38.9, accuracy_meters: 10)
    end
  end

  test "personal stats count only verified cups, in Addis time" do
    travel_to Time.utc(2026, 10, 21, 9) do
      get api_v1_personal_stats_path, headers: bearer_headers(@user), as: :json
    end
    assert_response :success
    data = response_json["data"]

    assert_equal({ "cups" => 3, "cafes" => 2, "areas" => 2, "reviews" => 1 }, data["totals"].slice("cups", "cafes", "areas", "reviews"))
    assert_equal({ "current_weeks" => 2, "longest_weeks" => 2, "coffee_days" => 2, "best_day_cups" => 2 }, data["streaks"])
    assert_equal [ 1, 1, 1 ], data["by_hour"].values_at(8, 9, 15)
    assert_equal 3, data["by_hour"].sum
    assert_equal [ 3, 0, 0, 0, 0, 0, 0 ], data["by_weekday"]
    assert_equal({ "month" => "2026-10", "cups" => 3 }, data["by_month"].last)
    assert_equal shops(:bole).id, data.dig("favorite_cafe", "shop", "id")
    assert_equal 2, data.dig("favorite_cafe", "cups")
    assert_equal 2, data.dig("favorite_drink", "cups")
    assert_equal "Bole", data.dig("top_areas", 0, "name")
    assert_equal 5.0, data["average_rating"]
    assert_equal({ "rank" => 1, "drinkers" => 1 }, data["city_rank"])
    assert_equal 2, data.dig("stamp_levels", "bronze")
  end

  test "personal stats need a session" do
    get api_v1_personal_stats_path, as: :json
    assert_response :unauthorized
  end

  test "a newcomer gets empty stats, not errors" do
    get api_v1_personal_stats_path, headers: bearer_headers(create_user), as: :json
    assert_response :success
    assert_equal 0, response_json.dig("data", "totals", "cups")
    assert_nil response_json.dig("data", "city_rank")
    assert_nil response_json.dig("data", "favorite_cafe")
  end

  test "city stats are public and add up every passport" do
    travel_to Time.utc(2026, 10, 21, 9) do
      get api_v1_city_stats_path, as: :json
    end
    assert_response :success
    data = response_json["data"]

    assert_equal 3, data.dig("totals", "cups")
    assert_equal 2, data.dig("totals", "cups_this_week")
    assert_equal 1, data.dig("totals", "drinkers")
    assert_equal 2, data.dig("totals", "cafes")
    assert_equal 1, data.dig("totals", "jebena_cafes")
    assert_equal 0, data.dig("totals", "unstamped_cafes")
    assert_equal [ shops(:bole).id, shops(:piassa).id ], data["top_cafes"].map { |row| row.dig("shop", "id") }
    assert_equal({ "cafes" => 1, "cups" => 2, "cups_this_week" => 1 }, data["areas"].find { |area| area["name"] == "Bole" }.slice("cafes", "cups", "cups_this_week"))
    assert_equal [], data["top_rated"]
    assert_equal({ "name" => "macchiato", "cups" => 2 }, data.dig("top_drinks", 0).merge("name" => data.dig("top_drinks", 0, "name").downcase))
  end

  private
    def drink_at(shop, time, **extras)
      travel_to Time.zone.parse(time) do
        CheckIn.record!(user: @user, shop: shop, idempotency_key: "#{shop.id}-#{time}",
          latitude: shop.latitude, longitude: shop.longitude, accuracy_meters: 10, **extras)
      end
    end
end
