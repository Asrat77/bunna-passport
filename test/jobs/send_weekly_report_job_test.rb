require "test_helper"

class SendWeeklyReportJobTest < ActiveJob::TestCase
  setup do
    @moderator = telegram_user(trust_level: :moderator, telegram_chat_started_at: 1.day.ago)
    telegram_user(trust_level: :moderator) # never started the bot
  end

  test "sends last week's numbers with the week before to the ops chat" do
    now = Time.find_zone("Africa/Addis_Ababa").local(2025, 11, 10, 8, 45)
    User.update_all(created_at: now - 1.year)
    2.times { create_user(created_at: now - 3.days) }
    create_user(created_at: now - 10.days)

    bot = travel_to(now) do
      with_fake_bot(env: { "PUBLIC_BASE_URL" => "https://bunna.example" }) { SendWeeklyReportJob.perform_now }
    end

    assert_equal [ @moderator.telegram_user_id ], bot.sent.map { |message| message[:chat_id] }
    text = bot.sent.first[:text]
    assert_match "Bunna last week (Nov 3–9)", text
    assert_match "• <b>2</b> new users (↑ from 1)", text
    assert_match "invites accepted (same as the week before)", text
    assert_match "#{User.count} people have signed up so far.", text
    assert_equal "https://bunna.example/console/dashboard", bot.sent.first[:reply_markup][:inline_keyboard].dig(0, 0, :url)
  end

  test "spans two months when the week does" do
    message = Telegram::Messages.weekly_report(Ops::WeeklyReport.new(now: Time.find_zone("Africa/Addis_Ababa").local(2025, 11, 4)))

    assert_match "(Oct 27 – Nov 2)", message[:text]
  end

  test "does nothing without a bot" do
    assert_nothing_raised { SendWeeklyReportJob.perform_now }
  end
end
