require "test_helper"

class Api::V1::InviteMessagesTest < ActionDispatch::IntegrationTest
  test "a Telegram account gets a prepared invite message with an open button" do
    user = create_user(telegram_user_id: 5151)

    sent = capture_prepared_messages do
      with_env("TELEGRAM_BOT_TOKEN" => "123:test", "TELEGRAM_BOT_USERNAME" => "@bunna_bot") do
        post api_v1_invite_message_path, params: { text: "Join me ☕", button: "Open Bunna" }, headers: bearer_headers(user), as: :json
      end
    end

    assert_response :success
    assert_equal "prepared-1", response_json.dig("data", "prepared_message_id")
    result = sent.first[:result]
    assert_equal 5151, sent.first[:user_id]
    assert_equal "article", result[:type]
    assert_equal "Join me ☕", result.dig(:input_message_content, :message_text)
    button = result.dig(:reply_markup, :inline_keyboard, 0, 0)
    assert_equal "Open Bunna", button[:text]
    assert_equal "https://t.me/bunna_bot?startapp=invite_#{user.reload.invite_token}", button[:url]
  end

  test "without Telegram the app gets only the link" do
    user = create_user

    sent = capture_prepared_messages do
      with_env("TELEGRAM_BOT_TOKEN" => "123:test", "TELEGRAM_BOT_USERNAME" => "bunna_bot") do
        post api_v1_invite_message_path, params: { text: "Join me" }, headers: bearer_headers(user), as: :json
      end
    end

    assert_response :success
    assert_nil response_json.dig("data", "prepared_message_id")
    assert_match "startapp=invite_", response_json.dig("data", "url")
    assert_empty sent
  end

  private
    def capture_prepared_messages
      sent = []
      original = Telegram::Bot.instance_method(:save_prepared_inline_message)
      Telegram::Bot.define_method(:save_prepared_inline_message) do |**args|
        sent << args
        "prepared-#{sent.size}"
      end
      yield
      sent
    ensure
      Telegram::Bot.define_method(:save_prepared_inline_message, original)
    end
end
