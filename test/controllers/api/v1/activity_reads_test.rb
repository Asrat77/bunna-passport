require "test_helper"

class Api::V1::ActivityReadsTest < ActionDispatch::IntegrationTest
  test "profile, passport, and badges expose progress" do
    user = create_user(created_at: 2.days.ago)
    check_in = CheckIn.record!(
      user: user,
      shop: shops(:bole),
      idempotency_key: "progress",
      latitude: shops(:bole).latitude,
      longitude: shops(:bole).longitude,
      accuracy_meters: 10
    )
    Badge.evaluate_for(user.reload)
    headers = bearer_headers(user)

    get api_v1_profile_path, headers: headers, as: :json
    assert_equal 1, response_json.dig("data", "verified_check_ins_count")

    get api_v1_passport_path, headers: headers, as: :json
    assert_equal [ check_in.shop_id ], response_json.dig("data", "stamps").pluck("shop").pluck("id")
    assert_equal 1, response_json.dig("data", "stamped_count")

    get api_v1_badges_path, headers: headers, as: :json
    first_cup = response_json["data"].find { |badge| badge["slug"] == "first-check-in" }
    assert_equal 1, first_cup["progress"]
    assert first_cup["earned_at"].present?
  end

  test "leaderboards are public and validate scope" do
    user = create_user
    LeaderboardEntry.create!(
      user: user,
      scope_key: LeaderboardEntry::CITY_SCOPE,
      period: :week,
      metric: :cups,
      period_started_at: Time.current.beginning_of_week,
      value: 4,
      rank: 1,
      refreshed_at: Time.current
    )

    get api_v1_leaderboards_path, params: { scope: "city", period: "week", metric: "cups" }, as: :json
    assert_response :success
    assert_equal user.handle, response_json.dig("data", 0, "user", "handle")

    get api_v1_leaderboards_path, params: { scope: "friends" }, as: :json
    assert_response :bad_request

    get api_v1_leaderboards_path, params: { period: "year" }, as: :json
    assert_response :bad_request
  end
end
