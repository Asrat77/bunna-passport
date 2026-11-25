require "test_helper"

class ReferralTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper

  setup do
    @inviter = users(:two)
    @friend = User.create!(email_address: "new@example.com", password: "password-123", handle: "newfriend", display_name: "New Friend")
  end

  test "a newcomer who accepts an invite is referred, and the referral pays at their first verified visit" do
    @friend.referred_by!(@inviter)
    assert_equal @inviter, @friend.reload.referred_by
    assert_equal 0, @inviter.rewarded_referrals.count

    assert_enqueued_with(job: SendReferralRewardJob) { visit!(@friend) }
    assert @friend.reload.referral_rewarded_at
    assert_equal 1, @inviter.rewarded_referrals.count
    assert @inviter.badges.exists?(slug: "first-referral")

    assert_no_enqueued_jobs(only: SendReferralRewardJob) { visit!(@friend, shop: shops(:piassa)) }
  end

  test "someone who already checked in, or joined before the inviter, isn't a referral" do
    visit!(@friend)
    @friend.reload.referred_by!(@inviter)
    assert_nil @friend.reload.referred_by_id

    @inviter.referred_by!(@friend)
    assert_nil @inviter.reload.referred_by_id
  end

  test "the first inviter keeps the referral" do
    @friend.referred_by!(@inviter)
    @friend.referred_by!(users(:one))
    assert_equal @inviter, @friend.reload.referred_by
  end

  private
    def visit!(user, shop: shops(:bole))
      CheckIn.record!(
        user: user, shop: shop, idempotency_key: SecureRandom.uuid,
        latitude: shop.latitude, longitude: shop.longitude, accuracy_meters: 10
      )
    end
end
