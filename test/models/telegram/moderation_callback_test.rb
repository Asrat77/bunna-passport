require "test_helper"

class Telegram::ModerationCallbackTest < ActiveJob::TestCase
  setup do
    @bot = FakeTelegramBot.new
    @moderator = telegram_user(trust_level: :moderator, display_name: "Hanna")
  end

  test "a moderator verifies a flagged check-in from the digest" do
    check_in = flagged_check_in

    tap_button("mod:ci_ok:#{check_in.id}")

    assert check_in.reload.verified?
    assert_equal "✅ Verified by Hanna.", @bot.answers.sole[:text]
    redrawn = @bot.edits.sole
    assert_equal [ 555, 9 ], [ redrawn[:chat_id], redrawn[:message_id] ]
    assert_match "Verified by Hanna", redrawn[:text]
    assert_nil redrawn[:reply_markup], "buttons are gone once settled"
  end

  test "a moderator rejects a flagged check-in" do
    check_in = flagged_check_in

    tap_button("mod:ci_no:#{check_in.id}")

    assert check_in.reload.rejected?
  end

  test "a moderator approves and rejects café edits" do
    approved = pending_edit(landmark: "Opposite the stadium")
    rejected = pending_edit(landmark: "Somewhere wrong")

    tap_button("mod:ed_ok:#{approved.id}")
    tap_button("mod:ed_no:#{rejected.id}")

    assert approved.reload.approved?
    assert_equal @moderator, approved.reviewed_by
    assert_equal "Opposite the stadium", shops(:bole).reload.landmark
    assert rejected.reload.rejected?
    assert_equal Telegram::ModerationCallback::REJECTION_REASON, rejected.rejection_reason
  end

  test "a second tap on a settled item changes nothing" do
    check_in = flagged_check_in
    tap_button("mod:ci_no:#{check_in.id}")

    tap_button("mod:ci_ok:#{check_in.id}")

    assert check_in.reload.rejected?
    assert_equal "Already rejected.", @bot.answers.last[:text]
  end

  test "someone who isn't a moderator can't use the buttons" do
    check_in = flagged_check_in
    curator = telegram_user(trust_level: :curator)

    tap_button("mod:ci_ok:#{check_in.id}", from: curator)

    assert check_in.reload.flagged?
    assert_equal "Only moderators can do that.", @bot.answers.sole[:text]
    assert_empty @bot.edits
  end

  test "buttons can't reach other kinds of contribution" do
    submission = Contribution.record!(user: create_user, contributable: Shop::Submission.new(
      name: "Far Away Buna", name_am: "ሩቅ ቡና", neighborhood: neighborhoods(:bole),
      landmark: "By the river", latitude: 9.05, longitude: 38.70
    ))

    tap_button("mod:ed_ok:#{submission.id}")
    tap_button("mod:nope:#{submission.id}")

    assert submission.reload.pending?
    assert_equal [ "That item is gone.", "That button is out of date." ], @bot.answers.map { |answer| answer[:text] }
  end

  private
    def tap_button(data, from: @moderator)
      Telegram::Update.new({ "callback_query" => {
        "id" => "cb#{SecureRandom.hex(2)}",
        "from" => { "id" => from.telegram_user_id },
        "message" => { "message_id" => 9, "chat" => { "id" => 555 } },
        "data" => data
      } }, bot: @bot).handle
    end

    def flagged_check_in
      user = create_user(created_at: 2.days.ago)
      CheckIn.record!(
        user: user, shop: shops(:bole), idempotency_key: SecureRandom.uuid,
        latitude: shops(:bole).latitude, longitude: shops(:bole).longitude,
        accuracy_meters: 10, mock_location: true
      )
    end

    def pending_edit(changes)
      Contribution.record!(user: create_user, contributable: shops(:bole).edits.build(proposed_changes: changes))
    end
end
