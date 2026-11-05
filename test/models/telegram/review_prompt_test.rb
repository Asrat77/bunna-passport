require "test_helper"

# The bot's "how was it?" a while after a visit nobody rated, and the cups
# under it that save a rating in one tap.
class Telegram::ReviewPromptTest < ActiveJob::TestCase
  setup do
    @user = telegram_user(telegram_chat_started_at: 2.days.ago, created_at: 2.days.ago)
  end

  test "a silent visit is asked about later, once, with five cups to tap" do
    check_in = visit(@user)

    assert_enqueued_with(job: SendReviewPromptJob, args: [ check_in ])
    bot = with_fake_bot do
      SendReviewPromptJob.perform_now(check_in)
      SendReviewPromptJob.perform_now(check_in)
    end

    message = bot.sent.sole
    assert_equal @user.telegram_user_id, message[:chat_id]
    assert_match "How was <b>Buna House</b>?", message[:text]
    assert_equal (1..5).map { |n| "rate:#{check_in.id}:#{n}" }, message[:reply_markup][:inline_keyboard].first.map { |button| button[:callback_data] }
    assert check_in.reload.review_prompted_at
  end

  test "a visit rated in the app isn't asked about" do
    check_in = visit(@user)
    check_in.update!(rating: 4)

    bot = with_fake_bot { SendReviewPromptJob.perform_now(check_in) }

    assert_empty bot.sent
  end

  test "a visit with a rating already says something and schedules nothing" do
    assert_no_enqueued_jobs(only: SendReviewPromptJob) { visit(@user, rating: 5) }
  end

  test "people who turned nudges off aren't asked" do
    @user.update!(daily_nudges: false)
    check_in = visit(@user)

    bot = with_fake_bot { SendReviewPromptJob.perform_now(check_in) }

    assert_empty bot.sent
  end

  test "at most one prompt a day" do
    first = visit(@user, occurred_at: 6.hours.ago)
    second = visit(@user)

    bot = with_fake_bot do
      SendReviewPromptJob.perform_now(first)
      SendReviewPromptJob.perform_now(second)
    end

    assert_equal 1, bot.sent.size
  end

  test "tapping a cup saves the rating and redraws the prompt" do
    check_in = visit(@user)
    bot = FakeTelegramBot.new

    tap_button(bot, "rate:#{check_in.id}:4")

    assert_equal 4, check_in.reload.rating
    assert_equal "Thanks! Saved 4/5.", bot.answers.sole[:text]
    assert_match "You gave <b>Buna House</b>", bot.edits.sole[:text]
  end

  test "a second tap doesn't change the rating" do
    check_in = visit(@user)
    bot = FakeTelegramBot.new

    tap_button(bot, "rate:#{check_in.id}:4")
    tap_button(bot, "rate:#{check_in.id}:1")

    assert_equal 4, check_in.reload.rating
  end

  test "nobody else can rate someone's visit" do
    check_in = visit(@user)
    stranger = telegram_user
    bot = FakeTelegramBot.new

    tap_button(bot, "rate:#{check_in.id}:1", from: stranger)

    assert_nil check_in.reload.rating
    assert_equal "That button is out of date.", bot.answers.sole[:text]
  end

  test "an old visit can't be rated" do
    check_in = visit(@user)
    bot = FakeTelegramBot.new

    travel 8.days do
      tap_button(bot, "rate:#{check_in.id}:5")
    end

    assert_nil check_in.reload.rating
  end

  private
    def visit(user, occurred_at: nil, rating: nil)
      travel_to(occurred_at || Time.current) do
        CheckIn.record!(
          user: user, shop: shops(:bole), idempotency_key: SecureRandom.uuid,
          latitude: shops(:bole).latitude, longitude: shops(:bole).longitude,
          accuracy_meters: 10, rating: rating
        )
      end
    end

    def tap_button(bot, data, from: @user)
      Telegram::Update.new({ "callback_query" => {
        "id" => "cb#{SecureRandom.hex(2)}",
        "from" => { "id" => from.telegram_user_id },
        "message" => { "message_id" => 9, "chat" => { "id" => 555 } },
        "data" => data
      } }, bot: bot).handle
    end
end
