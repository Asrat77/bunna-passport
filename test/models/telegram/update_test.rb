require "test_helper"

class Telegram::UpdateTest < ActiveSupport::TestCase
  setup { @bot = FakeTelegramBot.new }

  test "/start creates the account, opens the chat and welcomes with the Mini App button" do
    with_fake_bot(@bot) do
      assert_difference -> { User.count }, 1 do
        handle(text_message("/start", from: { id: 4242, first_name: "Selam", username: "selam_b" }))
      end
    end

    user = User.find_by!(telegram_user_id: 4242)
    assert user.bot_chat?
    welcome = @bot.sent.sole
    assert_equal 4242, welcome[:chat_id]
    assert_match "Selam Selam", welcome[:text]
    assert_equal({ text: "Open Bunna Passport", web_app: { url: "https://bunna.example" } }, welcome[:reply_markup][:inline_keyboard].dig(0, 0))
  end

  test "/start with a payload or a bot suffix still welcomes an existing account" do
    user = telegram_user(display_name: "Abebe <b>")

    with_fake_bot(@bot) do
      assert_no_difference -> { User.count } do
        handle(text_message("/start@bunnabot invite_abc", from: { id: user.telegram_user_id }))
      end
    end

    assert_match "Abebe &lt;b&gt;", @bot.sent.sole[:text]
  end

  test "without an HTTPS Mini App URL the welcome has no button" do
    with_fake_bot(@bot, env: { "TELEGRAM_MINI_APP_URL" => nil, "PUBLIC_BASE_URL" => "http://localhost:3000" }) do
      handle(text_message("/start", from: { id: 7 }))
    end

    assert_nil @bot.sent.sole[:reply_markup]
  end

  test "commands turn the daily nudge off and on" do
    user = telegram_user

    with_fake_bot(@bot) { handle(text_message("/nudges_off", from: { id: user.telegram_user_id })) }
    assert_not user.reload.daily_nudges?
    assert_match "/nudges_on", @bot.sent.last[:text]

    with_fake_bot(@bot) { handle(text_message("/nudges_on", from: { id: user.telegram_user_id })) }
    assert user.reload.daily_nudges?
  end

  test "the nudge's stop button turns nudges off and answers the tap" do
    user = telegram_user

    with_fake_bot(@bot) do
      handle({ "callback_query" => { "id" => "cb1", "from" => { "id" => user.telegram_user_id }, "data" => Telegram::Messages::NUDGES_OFF } })
    end

    assert_not user.reload.daily_nudges?
    assert_equal "cb1", @bot.answers.sole[:callback_query_id]
  end

  test "blocking the bot closes the chat and unblocking reopens it" do
    user = telegram_user(telegram_chat_started_at: 1.day.ago)

    with_fake_bot(@bot) { handle(membership(user, "kicked")) }
    assert_not user.reload.bot_chat?

    with_fake_bot(@bot) { handle(membership(user, "member")) }
    assert user.reload.bot_chat?
  end

  test "group messages are ignored" do
    with_fake_bot(@bot) do
      assert_no_difference -> { User.count } do
        handle(text_message("/start", from: { id: 99 }, chat_type: "group"))
      end
    end

    assert_empty @bot.sent
  end

  private
    def handle(payload)
      Telegram::Update.new(payload, bot: @bot).handle
    end

    def text_message(text, from:, chat_type: "private")
      { "update_id" => 1, "message" => { "text" => text, "from" => from, "chat" => { "id" => from[:id], "type" => chat_type } } }
    end

    def membership(user, status)
      { "my_chat_member" => {
        "chat" => { "id" => user.telegram_user_id, "type" => "private" },
        "from" => { "id" => user.telegram_user_id },
        "new_chat_member" => { "status" => status }
      } }
    end
end
