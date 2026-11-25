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

  test "is for moderators only" do
    sign_in_as users(:one)
    get console_cafe_reports_path

    assert_response :forbidden
  end
end
