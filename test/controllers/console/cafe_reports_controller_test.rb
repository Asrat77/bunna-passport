require "test_helper"

class Console::CafeReportsControllerTest < ActionDispatch::IntegrationTest
  setup { sign_in_as users(:two) }

  test "shows each café's scans by week" do
    Shop::Scan.record!(shop: shops(:bole), user: users(:one), opened_at: 1.hour.ago, first_open: true)

    get console_cafe_reports_path

    assert_response :success
    assert_select ".scans-table td", text: /Buna House/
    assert_select ".scans-table td small", text: /0 checked in · 1 new/
  end

  test "shows a café's monthly report with the text for its owner" do
    get console_cafe_report_path(shops(:bole), month: "2026-12")

    assert_response :success
    assert_select "h1", text: /December 2026/
    assert_select "textarea#owner-report", text: /Buna House: December 2026 on Bunna Passport/
    assert_select ".weekday-bars li", count: 7
  end

  test "is for moderators only" do
    sign_in_as users(:one)
    get console_cafe_reports_path

    assert_response :forbidden
  end
end
