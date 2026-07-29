require "test_helper"

class Api::V1::ShopsTest < ActionDispatch::IntegrationTest
  test "catalog is public, bilingual, and returns sync metadata and tombstones" do
    get api_v1_shops_path, params: { q: "Buna" }, as: :json

    assert_response :success
    assert_equal [ shops(:bole).id ], response_json.dig("data", "shops").pluck("id")
    assert response_json.dig("meta", "sync_until").present?

    get api_v1_shops_path, as: :json
    assert_includes response_json.dig("data", "tombstones").pluck("id"), shops(:hidden).id
  end

  test "catalog honors bbox and supports conditional no-change responses" do
    get api_v1_shops_path, params: { bbox: "38.78,8.99,38.79,9.00" }, as: :json

    assert_response :success
    assert_equal [ shops(:bole).id ], response_json.dig("data", "shops").pluck("id")
    etag = response.headers.fetch("ETag")

    get api_v1_shops_path,
      params: { bbox: "38.78,8.99,38.79,9.00" },
      headers: { "If-None-Match" => etag },
      as: :json
    assert_response :not_modified
  end

  test "hidden and pending shops cannot be fetched directly" do
    get api_v1_shop_path(shops(:hidden)), as: :json

    assert_response :not_found
    assert_equal "not_found", response_json["code"]
  end

  test "shop hours remain visible with freshness metadata" do
    get api_v1_shop_path(shops(:bole)), as: :json

    assert_response :success
    assert_equal "stale", response_json.dig("data", "hours", "freshness")
    assert_equal "07:00", response_json.dig("data", "hours", "schedule", "monday", 0, "opens")

    get api_v1_shop_path(shops(:piassa)), as: :json
    assert_equal "unknown", response_json.dig("data", "hours", "freshness")
  end

  test "nearby similar submissions return duplicate candidates" do
    post api_v1_shops_path,
      params: { shop: submission_params },
      headers: bearer_headers(users(:one)),
      as: :json

    assert_response :conflict
    assert_equal "duplicate_candidates", response_json["code"]
    assert_equal shops(:bole).id, response_json["details"].first["id"]
  end

  test "explicit duplicate override creates a pending contribution even for a moderator" do
    assert_difference -> { Contribution.count }, 1 do
      post api_v1_shops_path,
        params: { shop: submission_params.merge(duplicate_override: true) },
        headers: bearer_headers(users(:two)),
        as: :json
    end

    assert_response :created
    assert_equal "pending", response_json.dig("data", "status")
  end

  test "invalid sync input is a structured bad request" do
    get api_v1_shops_path, params: { updated_since: "not-a-time" }, as: :json

    assert_response :bad_request
    assert_equal "bad_request", response_json["code"]
  end

  private
    def submission_params
      {
        name: "Buna Hous",
        name_am: shops(:bole).name_am,
        neighborhood_id: neighborhoods(:bole).id,
        landmark: "Behind the test mall",
        latitude: shops(:bole).latitude,
        longitude: shops(:bole).longitude,
        price_band: "standard",
        amenities: { wifi: true },
        hours: { monday: [ { opens: "07:00", closes: "18:00" } ] }
      }
    end
end
