require "test_helper"

class Shop::ScanTest < ActiveSupport::TestCase
  setup do
    @shop = shops(:bole)
    @week = Time.zone.parse("2026-12-08 00:00")...Time.zone.parse("2026-12-15 00:00")
  end

  test "counts scans, the ones that became a verified check-in there, and new accounts" do
    opened = Time.zone.parse("2026-12-09 09:00")
    Shop::Scan.record!(shop: @shop, user: users(:one), opened_at: opened, first_open: true)
    Shop::Scan.record!(shop: @shop, user: users(:two), opened_at: opened, first_open: false)
    Shop::Scan.record!(shop: @shop, user: users(:two), opened_at: opened + 1.day, first_open: false)
    # Outside the week.
    Shop::Scan.record!(shop: @shop, user: users(:one), opened_at: opened - 3.days, first_open: false)

    visit(users(:one), @shop, opened + 20.minutes)
    visit(users(:two), @shop, opened + 5.hours) # too late for the first scan
    visit(users(:two), shops(:piassa), opened + 1.day + 10.minutes) # another café

    assert_equal({ @shop.id => { scans: 3, check_ins: 1, signups: 1 } }, Shop::Scan.funnel(@week))
  end

  test "a launch that reloads is one scan" do
    opened = Time.zone.parse("2026-12-09 09:00")
    first = Shop::Scan.record!(shop: @shop, user: users(:one), opened_at: opened, first_open: true)

    assert_no_difference -> { Shop::Scan.count } do
      assert_equal first, Shop::Scan.record!(shop: @shop, user: users(:one), opened_at: opened, first_open: false)
    end
    assert first.reload.first_open
  end

  private
    def visit(user, shop, at)
      CheckIn.insert!({
        user_id: user.id, shop_id: shop.id, status: "verified", occurred_at: at, verified_at: at,
        latitude: shop.latitude, longitude: shop.longitude, accuracy_meters: 10, distance_meters: 5,
        idempotency_key: SecureRandom.uuid, created_at: at, updated_at: at
      })
    end
end
