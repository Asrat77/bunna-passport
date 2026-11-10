require "test_helper"

class ChallengeBadgeTest < ActiveSupport::TestCase
  setup do
    @starts = Time.zone.parse("2026-12-08")
    @ends = Time.zone.parse("2026-12-29")
    @badge = Badge.install_challenge!(
      slug: "bole-10", name: "Bole 10", description: "Collect a stamp at both cafés.",
      shops: [ shops(:bole), shops(:piassa) ], starts_at: @starts, ends_at: @ends
    )
    @user = create_user
  end

  test "is earned by a verified visit to every café on the list inside the window" do
    visit(shops(:bole), at: @starts - 1.day) # before it opened
    assert_equal 0, @badge.progress_for(@user)

    visit(shops(:bole), at: @starts + 1.day)
    assert_equal 1, @badge.progress_for(@user)
    assert_empty Badge.evaluate_for(@user).select { |award| award.badge == @badge }

    visit(shops(:piassa), at: @starts + 2.days)
    assert_equal [ @badge ], Badge.evaluate_for(@user).map(&:badge) & [ @badge ]
  end

  test "a visit after it closes doesn't count" do
    visit(shops(:bole), at: @starts + 1.day)
    visit(shops(:piassa), at: @ends)

    assert_equal 1, @badge.progress_for(@user)
  end

  test "shows on the shelf while it runs, and afterwards only to those who earned it" do
    assert_not @badge.shown_to?(earned: false, at: @starts - 1.second)
    assert @badge.shown_to?(earned: false, at: @starts)
    assert_not @badge.shown_to?(earned: false, at: @ends)
    assert @badge.shown_to?(earned: true, at: @ends + 1.year)
    assert badges(:first_cup).shown_to?(earned: false)
  end

  test "needs its cafés and a window that ends after it starts" do
    @badge.shop_ids = []
    assert_not @badge.valid?

    @badge.shop_ids = [ shops(:bole).id ]
    @badge.threshold = 1
    @badge.ends_at = @starts
    assert_not @badge.valid?
    assert @badge.errors.key?(:ends_at)
  end

  test "running it again updates the list and keeps the slug" do
    assert_no_difference -> { Badge.count } do
      Badge.install_challenge!(slug: "bole-10", name: "Bole 10", description: "One café.", shops: [ shops(:bole) ], starts_at: @starts, ends_at: @ends)
    end
    assert_equal [ shops(:bole).id ], @badge.reload.shop_ids
    assert_equal 1, @badge.threshold
  end

  private
    def visit(shop, at:)
      CheckIn.create!(
        user: @user, shop: shop, idempotency_key: SecureRandom.uuid, occurred_at: at,
        latitude: shop.latitude, longitude: shop.longitude, accuracy_meters: 10, distance_meters: 0,
        status: :verified, verified_at: at
      )
    end
end
