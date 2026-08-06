require "test_helper"

class Api::V1::ShopReviewsTest < ActionDispatch::IntegrationTest
  setup do
    @shop = shops(:bole)
  end

  test "a verified visit with a rating or a note is a review" do
    rated = visit(rating: 5)
    noted = visit(note: "Best macchiato in Bole", key: "noted")
    visit(key: "silent") # no rating, no note

    get api_v1_shop_reviews_url(@shop)

    assert_response :success
    ids = response_json["data"].map { |review| review["id"] }
    assert_includes ids, rated.id
    assert_includes ids, noted.id
    assert_equal 2, ids.size, "a visit with nothing said is not a review"
  end

  test "a rejected visit never becomes a review" do
    # Too far from the shop, so the check-in is rejected outright.
    rejected = visit(rating: 1, latitude: 9.0042, longitude: 38.7877, key: "far")
    assert rejected.rejected?

    get api_v1_shop_reviews_url(@shop)

    assert_empty response_json["data"]
  end

  test "the summary averages only rated visits" do
    visit(rating: 4)
    visit(rating: 2, key: "second")
    visit(note: "no stars from me", key: "third")

    get api_v1_shop_reviews_url(@shop)

    meta = response_json["meta"]
    assert_in_delta 3.0, meta["rating_average"]
    assert_equal 2, meta["rating_count"]
    assert_equal 3, meta["total"]
  end

  test "a shop nobody has reviewed reports no average" do
    get api_v1_shop_reviews_url(@shop)

    assert_empty response_json["data"]
    assert_nil response_json["meta"]["rating_average"]
  end

  private
    def visit(rating: nil, note: nil, key: "review", latitude: nil, longitude: nil)
      CheckIn.record!(
        user: create_user(created_at: 2.days.ago),
        shop: @shop,
        idempotency_key: key,
        latitude: latitude || @shop.latitude,
        longitude: longitude || @shop.longitude,
        accuracy_meters: 10,
        mock_location: false,
        rating: rating,
        note: note
      )
    end
end
