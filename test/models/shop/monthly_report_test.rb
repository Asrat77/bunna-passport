require "test_helper"

class Shop::MonthlyReportTest < ActiveSupport::TestCase
  ZONE = Time.find_zone("Africa/Addis_Ababa")

  setup do
    @shop = shops(:bole)
    @newcomer = users(:one)
    @regular = users(:two)
    visit(@regular, ZONE.local(2026, 11, 20, 9)) # before the month: makes them a regular
    visit(@regular, ZONE.local(2026, 12, 5, 9))  # Saturday
    visit(@regular, ZONE.local(2026, 12, 12, 9)) # Saturday
    visit(@newcomer, ZONE.local(2026, 12, 9, 9)) # Wednesday
    visit(@newcomer, ZONE.local(2027, 1, 2, 9))  # next month
    Shop::Scan.record!(shop: @shop, user: @newcomer, opened_at: ZONE.local(2026, 12, 9, 8, 50), first_open: true)

    @report = Shop::MonthlyReport.new(@shop, month: ZONE.local(2026, 12, 15))
  end

  test "counts the month's visits and the people behind them" do
    assert_equal "December 2026", @report.label
    assert_equal 3, @report.check_ins
    assert_equal 1, @report.previous_check_ins
    assert_equal [ 2, 1, 1 ], [ @report.visitors, @report.new_visitors, @report.returning_visitors ]
    assert_equal [ [ "Saturday", 2 ], [ "Wednesday", 1 ] ], @report.busiest_days
    assert_equal({ scans: 1, check_ins: 1, signups: 1 }, @report.scans)
  end

  test "writes the owner's text" do
    text = @report.to_text
    assert_match "☕ Buna House: December 2026 on Bunna Passport", text
    assert_match "• 3 verified check-ins (1 the month before)", text
    assert_match "• 2 people came: 1 new to you, 1 coming back", text
    assert_match "• Busiest days: Saturday (2), Wednesday (1)", text
    assert_match "• 1 scan of your Bunna QR: 1 turned into a check-in, 1 new to Bunna Passport", text
  end

  test "defaults to last month, and reads a month from the console" do
    travel_to ZONE.local(2027, 1, 3) do
      assert_equal "December 2026", Shop::MonthlyReport.new(@shop).label
    end
    assert_equal ZONE.local(2026, 11, 1), Shop::MonthlyReport.parse_month("2026-11")
    assert_nil Shop::MonthlyReport.parse_month("2026-13")
    assert_nil Shop::MonthlyReport.parse_month("junk")
  end

  private
    def visit(user, at)
      CheckIn.insert!({
        user_id: user.id, shop_id: @shop.id, status: "verified", occurred_at: at, verified_at: at,
        latitude: @shop.latitude, longitude: @shop.longitude, accuracy_meters: 10, distance_meters: 5,
        idempotency_key: SecureRandom.uuid, created_at: at, updated_at: at
      })
    end
end
