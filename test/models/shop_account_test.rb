require "test_helper"

class ShopAccountTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper

  setup do
    @shop = shops(:bole)
    @owner = users(:one)
    @moderator = users(:two)
  end

  test "a claim waits for a moderator, who tells the moderators and then the claimant" do
    account = nil
    assert_enqueued_with(job: SendShopClaimJob) do
      account = ShopAccount.request!(shop: @shop, user: @owner, note: " I run the place ")
    end
    assert account.pending?
    assert_equal "I run the place", account.note
    assert_not @owner.owns_shop?(@shop)

    assert_enqueued_with(job: SendShopClaimDecisionJob) { account.approve!(by: @moderator) }
    assert @owner.owns_shop?(@shop)
    assert @owner.can_edit_menu?(@shop)
    assert_not @owner.owns_shop?(shops(:piassa))
  end

  test "asking twice is one claim; asking after a rejection asks again" do
    first = ShopAccount.request!(shop: @shop, user: @owner)
    assert_no_enqueued_jobs(only: SendShopClaimJob) do
      assert_equal first, ShopAccount.request!(shop: @shop, user: @owner)
    end

    first.reject!(by: @moderator)
    assert ShopAccount.request!(shop: @shop, user: @owner).reload.pending?
  end

  test "only a moderator decides" do
    account = ShopAccount.request!(shop: @shop, user: @owner)
    assert_raises(ShopAccount::NotAuthorized) { account.approve!(by: @owner) }
  end

  test "an owner's photos and hours or landmark changes skip review and the daily limit; other fields don't" do
    ShopAccount.request!(shop: @shop, user: @owner).approve!(by: @moderator)
    assert @owner.newcomer?

    3.times do |n|
      edit = @shop.edits.build(proposed_changes: { "landmark" => "Next to Edna Mall, gate #{n}" })
      assert Contribution.record!(user: @owner, contributable: edit).auto_approved?
    end
    assert_equal "Next to Edna Mall, gate 2", @shop.reload.landmark

    renamed = @shop.edits.build(proposed_changes: { "name" => "Buna House 2" })
    assert Contribution.record!(user: @owner, contributable: renamed).pending?
  end
end
