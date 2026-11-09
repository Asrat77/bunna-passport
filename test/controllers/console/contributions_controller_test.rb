require "test_helper"

class Console::ContributionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    sign_in_as users(:two)
    @first = Contribution.record!(user: users(:one), contributable: edit("Opposite the new bank"))
    @second = Contribution.record!(user: users(:one), contributable: edit("Beside the pharmacy"))
  end

  test "the queue lists what is waiting, oldest first" do
    get console_contributions_path

    assert_response :success
    assert_select ".tab--current", text: /Pending/
    assert_select ".queue-table__title", count: 2
    assert_match(/Opposite the new bank.*Beside the pharmacy/m, response.body)
  end

  test "an edit shows what changes, before and after" do
    get console_contribution_path(@first)

    assert_response :success
    assert_select ".diff__before", text: shops(:bole).landmark
    assert_select ".diff__after", text: "Opposite the new bank"
  end

  test "rejecting needs a reason, then goes on to the next one waiting" do
    post console_contribution_rejection_path(@first)
    assert_redirected_to console_contribution_path(@first)
    assert @first.reload.pending?

    post console_contribution_rejection_path(@first), params: { preset: "The location looks wrong.", reason: "It's across the road." }

    assert_redirected_to console_contribution_path(@second)
    assert_equal "The location looks wrong. It's across the road.", @first.reload.rejection_reason
  end

  test "approving the last one waiting goes back to the list" do
    @second.reject!(reviewer: users(:two), reason: "Duplicate.")

    post console_contribution_approval_path(@first)

    assert_redirected_to console_contributions_path
    assert @first.reload.approved?
    assert_equal "Opposite the new bank", shops(:bole).reload.landmark
  end

  private
    def edit(landmark)
      Shop::Edit.new(shop: shops(:bole), proposed_changes: { landmark: landmark })
    end
end
