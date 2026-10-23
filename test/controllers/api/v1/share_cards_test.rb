require "test_helper"

# Sharing a stamp: the API renders the cards once and hands back public URLs
# that Telegram and the phone can fetch without signing in.
class Api::V1::ShareCardsTest < ActionDispatch::IntegrationTest
  setup do
    skip "rsvg-convert is not installed" unless system("rsvg-convert", "--version", out: File::NULL, err: File::NULL)
  end

  test "renders the post and story cards and serves them by token" do
    user = create_user(created_at: 2.days.ago)
    check_in = visit(user)

    post api_v1_check_in_share_cards_path(check_in), headers: bearer_headers(user), as: :json

    assert_response :success
    data = response_json["data"]
    assert_equal true, data["doodle"]
    assert_equal 2, check_in.share_images.count

    get URI(data["story_url"]).path

    assert_response :success
    assert_equal "image/png", response.media_type
    assert_equal "noindex", response.headers["X-Robots-Tag"]
    assert_equal [ 1080, 1920 ], response.body.byteslice(16, 8).unpack("NN")
  end

  test "sharing again reuses the stored cards" do
    user = create_user(created_at: 2.days.ago)
    check_in = visit(user)

    2.times { post api_v1_check_in_share_cards_path(check_in), headers: bearer_headers(user), as: :json }

    assert_equal 2, check_in.share_images.count
  end

  test "hiding the doodle is a separate card" do
    user = create_user(created_at: 2.days.ago)
    check_in = visit(user)

    post api_v1_check_in_share_cards_path(check_in), params: { doodle: false }, headers: bearer_headers(user), as: :json

    assert_equal false, response_json["data"]["doodle"]
    assert_equal [ false ], check_in.share_images.distinct.pluck(:doodle)
  end

  test "only the visitor may share" do
    check_in = visit(create_user(created_at: 2.days.ago))

    post api_v1_check_in_share_cards_path(check_in), headers: bearer_headers(create_user), as: :json

    assert_response :not_found
  end

  test "a visit still under review has no stamp to share" do
    user = create_user(created_at: 2.days.ago)
    check_in = visit(user)
    check_in.update!(status: :flagged, flag_reason: "mock_location")

    post api_v1_check_in_share_cards_path(check_in), headers: bearer_headers(user), as: :json

    assert_response :unprocessable_entity
    assert_equal "check_in_not_verified", response_json["code"]
  end

  test "an unknown token is not found" do
    get share_image_path("nope", format: :png)

    assert_response :not_found
  end

  private
    def visit(user)
      CheckIn.record!(
        user: user,
        shop: shops(:bole),
        idempotency_key: SecureRandom.uuid,
        latitude: shops(:bole).latitude,
        longitude: shops(:bole).longitude,
        accuracy_meters: 10
      )
    end
end
