require "test_helper"

# Saying something about a visit after the fact. The client asks once the stamp
# has landed, so the check-in already exists by the time this runs.
class Api::V1::CheckInSayingsTest < ActionDispatch::IntegrationTest
  test "a rating added afterwards reaches the shop's reviews" do
    user = create_user(created_at: 2.days.ago)
    check_in = visit(user)
    assert_nil check_in.rating

    patch api_v1_check_in_path(check_in),
      params: { check_in: { rating: 4, note: "Quiet in the morning" } },
      headers: bearer_headers(user), as: :json

    assert_response :success
    assert_equal 4, check_in.reload.rating

    get api_v1_shop_reviews_url(shops(:bole))
    notes = response_json["data"].map { |review| review["note"] }
    assert_includes notes, "Quiet in the morning"
  end

  test "only the visitor may say anything" do
    owner = create_user(created_at: 2.days.ago)
    check_in = visit(owner)

    patch api_v1_check_in_path(check_in),
      params: { check_in: { rating: 1 } },
      headers: bearer_headers(create_user), as: :json

    assert_response :not_found
    assert_nil check_in.reload.rating
  end

  test "the window closes after a day" do
    user = create_user(created_at: 3.days.ago)
    check_in = visit(user)

    travel_to check_in.occurred_at + 25.hours do
      patch api_v1_check_in_path(check_in),
        params: { check_in: { rating: 5 } },
        headers: bearer_headers(user), as: :json
    end

    assert_response :unprocessable_entity
    assert_equal "saying_window_closed", response_json["code"]
    assert_nil check_in.reload.rating
  end

  test "a rejected visit stays silent" do
    user = create_user(created_at: 2.days.ago)
    # Far enough away that the check-in is rejected outright.
    rejected = visit(user, latitude: 9.0042, longitude: 38.7877)
    assert rejected.rejected?

    patch api_v1_check_in_path(rejected),
      params: { check_in: { rating: 5 } },
      headers: bearer_headers(user), as: :json

    assert_response :unprocessable_entity
    assert_equal "check_in_rejected", response_json["code"]
  end

  test "where the visit happened cannot be revised afterwards" do
    user = create_user(created_at: 2.days.ago)
    check_in = visit(user)
    elsewhere = Shop.where.not(id: shops(:bole).id).first

    patch api_v1_check_in_path(check_in),
      params: { check_in: { rating: 3, shop_id: elsewhere&.id, latitude: 1.0 } },
      headers: bearer_headers(user), as: :json

    assert_response :success
    check_in.reload
    assert_equal shops(:bole).id, check_in.shop_id
    assert_equal shops(:bole).latitude.to_f, check_in.latitude.to_f
  end

  private
    def visit(user, latitude: nil, longitude: nil)
      CheckIn.record!(
        user: user,
        shop: shops(:bole),
        idempotency_key: SecureRandom.uuid,
        latitude: latitude || shops(:bole).latitude,
        longitude: longitude || shops(:bole).longitude,
        accuracy_meters: 10,
        mock_location: false
      )
    end
end
