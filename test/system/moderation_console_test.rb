require "application_system_test_case"

class ModerationConsoleTest < ApplicationSystemTestCase
  setup do
    @contributor = create_user
    @contribution = Contribution.record!(
      user: @contributor,
      contributable: Shop::Submission.new(
        name: "Console Coffee",
        name_am: "የኮንሶል ቡና",
        neighborhood: neighborhoods(:bole),
        landmark: "Near the operations queue",
        latitude: 8.998,
        longitude: 38.792
      )
    )
    @report = Report.create!(
      user: users(:one),
      reportable: @contributor,
      reason: :spam,
      note: "Console review fixture"
    )
    @flagged = CheckIn.record!(
      user: @contributor,
      shop: shops(:bole),
      idempotency_key: "console-flag",
      latitude: shops(:bole).latitude,
      longitude: shops(:bole).longitude,
      accuracy_meters: 10,
      mock_location: true
    )
  end

  test "founder resolves the unified moderation queue" do
    sign_in

    assert_text "Community health"
    assert_text "Submission from @#{@contributor.handle}"
    assert_text "Spam: User"
    assert_text "@#{@contributor.handle} at #{shops(:bole).name}"

    click_on "Submission from @#{@contributor.handle}"
    click_on "Approve"
    assert_text "Contribution approved."
    assert @contribution.reload.approved?
    assert @contribution.shop_submission.created_shop.live?

    visit console_report_path(@report)
    assert_text "Spam"
    click_on "Uphold"
    assert_text "Report upheld."
    assert @report.reload.upheld?
    assert @contributor.reload.newcomer?

    visit console_check_in_path(@flagged)
    assert_text shops(:bole).name
    click_on "Clear as verified"
    assert_text "Check-in verified and counters applied."
    assert @flagged.reload.verified?
  end

  test "founder bulk creates and non-destructively merges shops" do
    sign_in
    visit new_console_shop_batch_path
    fill_in "shops_json", with: [
      {
        name: "Batch Coffee",
        name_am: "የጥቅል ቡና",
        neighborhood_id: neighborhoods(:bole).id,
        landmark: "Batch landmark",
        latitude: 8.997,
        longitude: 38.791
      }
    ].to_json
    click_on "Create batch"
    assert_text "1 shops created."

    loser = Shop.find_by!(name: "Batch Coffee")
    visit new_console_shop_merge_path(loser)
    select "#{shops(:bole).name} · #{shops(:bole).neighborhood.name}", from: "winner_id"
    click_on "Merge duplicate"

    assert_text "was merged into"
    assert loser.reload.merged?
    assert_equal shops(:bole), loser.merged_into
  end

  private
    def sign_in
      visit new_session_path
      fill_in "email_address", with: users(:two).email_address
      fill_in "password", with: "password"
      click_on "Sign in"
      assert_text "Community health"
    end
end
