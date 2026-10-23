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

  test "a stamp can be shared from its shop" do
    user = create_user(created_at: 2.days.ago)
    check_in = visit(user)

    post api_v1_shop_share_cards_path(shops(:bole)), headers: bearer_headers(user), as: :json

    assert_response :success
    assert_equal check_in.id, response_json["data"]["check_in_id"]
  end

  test "a shop without the caller's stamp has nothing to share" do
    visit(create_user(created_at: 2.days.ago))

    post api_v1_shop_share_cards_path(shops(:bole)), headers: bearer_headers(create_user), as: :json

    assert_response :not_found
  end

  test "card links use the public address when one is set" do
    user = create_user(created_at: 2.days.ago)
    check_in = visit(user)

    with_env("PUBLIC_BASE_URL" => "https://cards.example.org") do
      post api_v1_check_in_share_cards_path(check_in), headers: bearer_headers(user), as: :json
    end

    assert_match %r{\Ahttps://cards\.example\.org/cards/\w+\.png\z}, response_json["data"]["post_url"]
  end

  test "a Telegram account gets a prepared message with the post card" do
    user = create_user(created_at: 2.days.ago, telegram_user_id: 4242)
    check_in = visit(user)

    sent = capture_prepared_messages do
      with_env("TELEGRAM_BOT_TOKEN" => "123:test", "TELEGRAM_BOT_USERNAME" => "@bunna_bot") do
        post api_v1_check_in_share_cards_path(check_in), params: { caption: "My stamp" }, headers: bearer_headers(user), as: :json
      end
    end

    data = response_json["data"]
    assert_equal "prepared-1", data["prepared_message_id"]
    assert_equal 4242, sent.first[:user_id]
    result = sent.first[:result]
    assert_equal "photo", result[:type]
    assert_equal data["post_url"], result[:photo_url]
    assert_equal "My stamp", result[:caption]
    assert_equal "https://t.me/bunna_bot", result.dig(:reply_markup, :inline_keyboard, 0, 0, :url)
  end

  test "without Telegram there is no prepared message" do
    user = create_user(created_at: 2.days.ago)
    check_in = visit(user)

    sent = capture_prepared_messages do
      with_env("TELEGRAM_BOT_TOKEN" => "123:test") do
        post api_v1_check_in_share_cards_path(check_in), headers: bearer_headers(user), as: :json
      end
    end

    assert_response :success
    assert_nil response_json["data"]["prepared_message_id"]
    assert_empty sent
  end

  test "a Bot API failure still returns the cards" do
    user = create_user(created_at: 2.days.ago, telegram_user_id: 4243)
    check_in = visit(user)

    capture_prepared_messages(raises: Telegram::Bot::Error.new("savePreparedInlineMessage failed: Bad Request")) do
      with_env("TELEGRAM_BOT_TOKEN" => "123:test") do
        post api_v1_check_in_share_cards_path(check_in), headers: bearer_headers(user), as: :json
      end
    end

    assert_response :success
    assert_nil response_json["data"]["prepared_message_id"]
  end

  test "an unknown token is not found" do
    get share_image_path("nope", format: :png)

    assert_response :not_found
  end

  private
    def with_env(values)
      previous = values.to_h { |key, _value| [ key, ENV[key] ] }
      values.each { |key, value| ENV[key] = value }
      yield
    ensure
      previous.each { |key, value| ENV[key] = value }
    end

    # Swaps the Bot API call for a recorder, so tests never reach Telegram.
    def capture_prepared_messages(raises: nil)
      sent = []
      original = Telegram::Bot.instance_method(:save_prepared_inline_message)
      Telegram::Bot.define_method(:save_prepared_inline_message) do |**args|
        raise raises if raises

        sent << args
        "prepared-#{sent.size}"
      end
      yield
      sent
    ensure
      Telegram::Bot.define_method(:save_prepared_inline_message, original)
    end

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
