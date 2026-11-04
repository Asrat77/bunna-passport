require "test_helper"

class SendModerationDigestJobTest < ActiveJob::TestCase
  setup do
    @moderator = telegram_user(trust_level: :moderator, telegram_chat_started_at: 1.day.ago)
    telegram_user(trust_level: :moderator) # never started the bot
  end

  test "sends the queue sizes, then the oldest easy cases with buttons" do
    flagged = flagged_check_in
    edit = pending_edit(landmark: "Next to the <new> bank")
    pending_submission

    bot = with_fake_bot(env: { "PUBLIC_BASE_URL" => "https://bunna.example" }) { SendModerationDigestJob.perform_now }

    assert_equal [ @moderator.telegram_user_id ], bot.sent.map { |message| message[:chat_id] }.uniq
    summary, check_in_message, edit_message = bot.sent
    assert_equal 3, bot.sent.size

    assert_match "Moderation queue: 3 waiting", summary[:text]
    assert_match "• 1 new café\n", summary[:text]
    assert_match "• 1 café edit\n", summary[:text]
    assert_match "• 0 photos", summary[:text]
    assert_match "• 1 flagged check-in", summary[:text]
    assert_equal "https://bunna.example/console/dashboard", summary[:reply_markup][:inline_keyboard].dig(0, 0, :url)

    assert_match "Flagged check-in at Buna House", check_in_message[:text]
    assert_match "the phone reported a mock location", check_in_message[:text]
    assert_equal [ "mod:ci_ok:#{flagged.id}", "mod:ci_no:#{flagged.id}" ],
      check_in_message[:reply_markup][:inline_keyboard][0].map { |button| button[:callback_data] }

    assert_match "Edit to Buna House", edit_message[:text]
    assert_match "Landmark: Behind the test mall → <b>Next to the &lt;new&gt; bank</b>", edit_message[:text]
    assert_equal "mod:ed_ok:#{edit.id}", edit_message[:reply_markup][:inline_keyboard].dig(0, 0, :callback_data)
  end

  test "sends nothing when every queue is empty" do
    bot = with_fake_bot { SendModerationDigestJob.perform_now }

    assert_empty bot.sent
  end

  test "caps the easy cases" do
    (Moderation::Digest::QUICK_ITEM_LIMIT + 2).times { |index| flagged_check_in(hours_ago: 10 * (index + 1)) }

    bot = with_fake_bot { SendModerationDigestJob.perform_now }

    assert_equal 1 + Moderation::Digest::QUICK_ITEM_LIMIT, bot.sent.size
    assert_match "7 flagged check-ins", bot.sent.first[:text]
    assert_nil bot.sent.first[:reply_markup], "no console button without an HTTPS base URL"
  end

  private
    def flagged_check_in(hours_ago: 1)
      user = create_user(created_at: 2.days.ago)
      travel_to(hours_ago.hours.ago) do
        CheckIn.record!(
          user: user, shop: shops(:bole), idempotency_key: SecureRandom.uuid,
          latitude: shops(:bole).latitude, longitude: shops(:bole).longitude,
          accuracy_meters: 10, mock_location: true
        ).tap { |check_in| assert check_in.flagged? }
      end
    end

    def pending_edit(changes)
      Contribution.record!(user: create_user, contributable: shops(:bole).edits.build(proposed_changes: changes))
        .tap { |contribution| assert contribution.pending? }
    end

    def pending_submission
      Contribution.record!(user: create_user, contributable: Shop::Submission.new(
        name: "Far Away Buna", name_am: "ሩቅ ቡና", neighborhood: neighborhoods(:bole),
        landmark: "By the river", latitude: 9.05, longitude: 38.70
      ))
    end
end
