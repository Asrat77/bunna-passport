require "test_helper"

class SendContributionDecisionJobTest < ActiveJob::TestCase
  setup do
    @moderator = users(:two)
  end

  test "tells the contributor their new café was approved" do
    contributor = telegram_user(telegram_chat_started_at: 1.day.ago)
    contribution = Contribution.record!(user: contributor, contributable: submission)

    bot = with_fake_bot do
      perform_enqueued_jobs(only: SendContributionDecisionJob) { contribution.approve!(reviewer: @moderator) }
    end

    message = bot.sent.sole
    assert_equal contributor.telegram_user_id, message[:chat_id]
    assert_match "The café you added, <b>Corner Buna</b>, was approved", message[:text]
    assert message[:reply_markup][:inline_keyboard].dig(0, 0, :web_app)
  end

  test "a rejection carries the moderator's reason, in the contributor's language" do
    contributor = telegram_user(telegram_chat_started_at: 1.day.ago, language: "am")
    contribution = Contribution.record!(user: contributor, contributable: edit)

    bot = with_fake_bot do
      perform_enqueued_jobs(only: SendContributionDecisionJob) do
        contribution.reject!(reviewer: @moderator, reason: "Already on Bunna <duplicate>.")
      end
    end

    text = bot.sent.sole[:text]
    assert_match "ያቀረቡት ማስተካከያ አልጸደቀም", text
    assert_match "Already on Bunna &lt;duplicate&gt;.", text
  end

  test "the stock reason from a Telegram button is left out" do
    contributor = telegram_user(telegram_chat_started_at: 1.day.ago)
    contribution = Contribution.record!(user: contributor, contributable: edit)

    bot = with_fake_bot do
      perform_enqueued_jobs(only: SendContributionDecisionJob) do
        contribution.reject!(reviewer: @moderator, reason: Telegram::ModerationCallback::REJECTION_REASON)
      end
    end

    assert_match "wasn't approved", bot.sent.sole[:text]
    assert_no_match "Moderator's note", bot.sent.sole[:text]
  end

  test "nothing is sent for something that went live straight away" do
    curator = telegram_user(telegram_chat_started_at: 1.day.ago, trust_level: :curator)

    assert_no_enqueued_jobs(only: SendContributionDecisionJob) do
      Contribution.record!(user: curator, contributable: submission)
    end
  end

  test "nothing is sent to someone who never started the bot, or about a reversed decision" do
    contribution = Contribution.record!(user: telegram_user, contributable: edit)
    reversed = Contribution.record!(user: telegram_user(telegram_chat_started_at: 1.day.ago), contributable: edit)

    bot = with_fake_bot do
      contribution.reject!(reviewer: @moderator, reason: "No.")
      reversed.reject!(reviewer: @moderator, reason: "No.")
      reversed.reverse!(by: @moderator)
      perform_enqueued_jobs(only: SendContributionDecisionJob)
    end

    assert_empty bot.sent
  end

  private
    def submission
      Shop::Submission.new(
        name: "Corner Buna", name_am: "ኮርነር ቡና", neighborhood: neighborhoods(:bole),
        landmark: "Next to the bakery", latitude: 9.03, longitude: 38.75
      )
    end

    def edit
      Shop::Edit.new(shop: shops(:bole), proposed_changes: { landmark: "Opposite the new bank" })
    end
end
