require "test_helper"

class TelegramJobsTest < ActiveJob::TestCase
  test "nudges people who started the bot and haven't had a cup, once a coffee day" do
    asleep = telegram_user(telegram_chat_started_at: 2.days.ago)
    awake = telegram_user(telegram_chat_started_at: 2.days.ago)
    opted_out = telegram_user(telegram_chat_started_at: 2.days.ago, daily_nudges: false)
    never_started = telegram_user
    visit(awake)

    bot = with_fake_bot do
      perform_enqueued_jobs { SendDailyNudgesJob.perform_now }
      perform_enqueued_jobs { SendDailyNudgesJob.perform_now }
    end

    assert_equal [ asleep.telegram_user_id ], bot.sent.map { |message| message[:chat_id] }
    assert_match "Had a cup today?", bot.sent.sole[:text]
    assert_equal Telegram::Messages::NUDGES_OFF, bot.sent.sole[:reply_markup][:inline_keyboard].dig(1, 0, :callback_data)
    assert asleep.reload.last_nudged_at
    assert_nil opted_out.reload.last_nudged_at
    assert_nil never_started.reload.last_nudged_at
  end

  test "the next coffee day starts at 04:00 Addis" do
    user = telegram_user(telegram_chat_started_at: 2.days.ago)
    # 03:30 Addis on the 24th still belongs to the 23rd's coffee day.
    user.update!(last_nudged_at: Time.find_zone("Africa/Addis_Ababa").local(2026, 10, 23, 15))

    assert_not User.nudgeable(Time.find_zone("Africa/Addis_Ababa").local(2026, 10, 24, 3, 30)).exists?(user.id)
    assert User.nudgeable(Time.find_zone("Africa/Addis_Ababa").local(2026, 10, 24, 4, 30)).exists?(user.id)
  end

  test "a blocked bot stops trying that chat" do
    user = telegram_user(telegram_chat_started_at: 2.days.ago)

    with_fake_bot(FakeTelegramBot.new(fail_with: Telegram::Bot::Forbidden.new("sendMessage failed: Forbidden: bot was blocked by the user"))) do
      SendNudgeJob.perform_now(user)
    end

    assert_not user.reload.bot_chat?
    assert_nil user.last_nudged_at
  end

  test "a new stamp and each level up send a message, other visits don't" do
    user = telegram_user(telegram_chat_started_at: 2.days.ago, created_at: 2.days.ago)

    bot = with_fake_bot do
      perform_enqueued_jobs(only: SendStampNotificationJob) do
        5.times { |index| visit(user, occurred_at: ((4 - index) * 5).hours.ago) }
      end
    end

    assert_equal 2, bot.sent.size
    assert_match "New stamp: <b>Buna House</b>", bot.sent.first[:text]
    assert_match "4 more cups for Silver", bot.sent.first[:text]
    assert_match "stamp is now Silver", bot.sent.second[:text]
    assert_match "10 more cups for Gold", bot.sent.second[:text]
  end

  test "email accounts and people who never started the bot get no stamp messages" do
    with_fake_bot do
      assert_no_enqueued_jobs(only: SendStampNotificationJob) do
        visit(create_user(created_at: 2.days.ago))
        visit(telegram_user(created_at: 2.days.ago))
      end
    end
  end

  test "a flagged visit's stamp is announced when a moderator verifies it" do
    user = telegram_user(telegram_chat_started_at: 2.days.ago, created_at: 2.days.ago)
    check_in = visit(user, mock_location: true)
    assert check_in.flagged?

    bot = with_fake_bot do
      perform_enqueued_jobs(only: SendStampNotificationJob) { check_in.verify! }
    end

    assert_match "New stamp", bot.sent.sole[:text]
  end

  private
    # Visits Buna House, backdated so the shop cooldown doesn't reject repeats.
    def visit(user, occurred_at: nil, mock_location: false)
      travel_to(occurred_at || Time.current) do
        CheckIn.record!(
          user: user, shop: shops(:bole), idempotency_key: SecureRandom.uuid,
          latitude: shops(:bole).latitude, longitude: shops(:bole).longitude,
          accuracy_meters: 10, mock_location: mock_location
        )
      end
    end
end
