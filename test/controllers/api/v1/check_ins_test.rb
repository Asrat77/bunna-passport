require "test_helper"

class Api::V1::CheckInsTest < ActionDispatch::IntegrationTest
  test "nearby check-in creates one verified cup and one permanent stamp" do
    user = create_user(created_at: 2.days.ago)
    headers = bearer_headers(user)
    params = { check_in: check_in_params(idempotency_key: "mobile-1") }

    assert_difference -> { CheckIn.count }, 1 do
      assert_difference -> { Stamp.count }, 1 do
        post api_v1_check_ins_path, params: params, headers: headers, as: :json
      end
    end

    assert_response :created
    assert_equal "accepted", response_json.dig("data", "status")
    assert_equal true, response_json.dig("data", "stamp_earned")
    assert_equal 1, user.reload.verified_check_ins_count

    assert_no_difference -> { CheckIn.count } do
      assert_no_difference -> { Stamp.count } do
        post api_v1_check_ins_path, params: params, headers: headers, as: :json
      end
    end
    assert_response :created
    assert_equal true, response_json.dig("data", "stamp_earned"), "replay must repeat the original answer"
    assert_equal 1, user.reload.verified_check_ins_count
  end

  test "the create response carries the level reached and the badges earned, on replay too" do
    user = create_user(created_at: 2.days.ago)
    params = { check_in: check_in_params(idempotency_key: "first-cup") }

    post api_v1_check_ins_path, params: params, headers: bearer_headers(user), as: :json
    assert_response :created
    assert_equal "bronze", response_json.dig("data", "level_reached")
    assert_equal [ "first-check-in" ], response_json.dig("data", "badges_earned").pluck("slug")

    post api_v1_check_ins_path, params: params, headers: bearer_headers(user), as: :json
    assert_equal [ "first-check-in" ], response_json.dig("data", "badges_earned").pluck("slug"), "replay must repeat the original answer"
  end

  test "a return visit that reaches a level says so and earns no badge twice" do
    user = create_user(created_at: 10.days.ago)
    4.times do |index|
      travel_to((5 - index).days.ago) do
        CheckIn.record!(
          user: user, shop: shops(:bole), idempotency_key: "visit-#{index}",
          latitude: shops(:bole).latitude, longitude: shops(:bole).longitude, accuracy_meters: 10
        )
      end
    end

    post api_v1_check_ins_path, params: { check_in: check_in_params }, headers: bearer_headers(user), as: :json

    assert_response :created
    assert_equal "silver", response_json.dig("data", "level_reached")
    assert_equal "silver", response_json.dig("data", "stamp_level")
    assert_empty response_json.dig("data", "badges_earned")
  end

  test "a flagged visit reaches no level and earns no badge until it is verified" do
    user = create_user

    post api_v1_check_ins_path, params: { check_in: check_in_params(mock_location: true) }, headers: bearer_headers(user), as: :json

    assert_nil response_json.dig("data", "level_reached")
    assert_empty response_json.dig("data", "badges_earned")

    check_in = CheckIn.last
    check_in.verify!
    assert_equal [ check_in.id ], user.awards.pluck(:check_in_id)
    assert_equal "bronze", check_in.reload.level_reached
  end

  test "a return visit adds a cup without claiming a second stamp" do
    user = create_user(created_at: 2.days.ago)
    CheckIn.record!(
      user: user, shop: shops(:bole), idempotency_key: "first-visit",
      latitude: shops(:bole).latitude, longitude: shops(:bole).longitude, accuracy_meters: 10
    ).update!(occurred_at: CheckIn::SHOP_COOLDOWN.ago - 1.minute)

    assert_no_difference -> { Stamp.count } do
      post api_v1_check_ins_path,
        params: { check_in: check_in_params(idempotency_key: "return-visit") },
        headers: bearer_headers(user),
        as: :json
    end

    assert_response :created
    assert_equal false, response_json.dig("data", "stamp_earned")
    assert_equal 2, user.reload.verified_check_ins_count
  end

  test "rejected attempts persist and return a distinct 422 code" do
    user = create_user

    assert_difference -> { CheckIn.rejected.count }, 1 do
      post api_v1_check_ins_path,
        params: { check_in: check_in_params(accuracy_meters: 101) },
        headers: bearer_headers(user),
        as: :json
    end

    assert_response :unprocessable_entity
    assert_equal "weak_gps", response_json["code"]
    assert_equal 0, user.reload.verified_check_ins_count
  end

  test "flagged status remains hidden and excluded until moderator clearance" do
    user = create_user

    post api_v1_check_ins_path,
      params: { check_in: check_in_params(mock_location: true) },
      headers: bearer_headers(user),
      as: :json

    assert_response :created
    assert_equal "accepted", response_json.dig("data", "status")
    assert_nil response_json.dig("data", "flag_reason")
    assert_equal true, response_json.dig("data", "stamp_earned"), "a flagged visit still earns its stamp"
    assert CheckIn.last.flagged?
    assert_equal 1, user.reload.stamps_count
    assert_equal 0, user.verified_check_ins_count
  end

  test "history is private and cursor paginated" do
    user = create_user(created_at: 2.days.ago)
    first = CheckIn.record!(
      user: user, shop: shops(:bole), idempotency_key: "history-1",
      latitude: shops(:bole).latitude, longitude: shops(:bole).longitude, accuracy_meters: 10
    )

    get api_v1_check_ins_path, headers: bearer_headers(user), as: :json
    assert_response :success
    assert_equal [ first.id ], response_json["data"].pluck("id")
    assert_equal first.id, response_json.dig("meta", "next_cursor")

    get api_v1_check_ins_path, params: { cursor: first.id }, headers: bearer_headers(user), as: :json
    assert_empty response_json["data"]
  end

  private
    def check_in_params(overrides = {})
      {
        shop_id: shops(:bole).id,
        idempotency_key: SecureRandom.uuid,
        latitude: shops(:bole).latitude,
        longitude: shops(:bole).longitude,
        accuracy_meters: 10,
        drink: "macchiato",
        rating: 5,
        note: "Bright and balanced"
      }.merge(overrides)
    end
end
