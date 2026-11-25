require "test_helper"

class Console::StickersControllerTest < ActionDispatch::IntegrationTest
  setup { sign_in_as users(:two) }

  test "lists a neighborhood's live cafés to pick from" do
    get console_stickers_path(neighborhood_id: neighborhoods(:bole).id)

    assert_response :success
    assert_select ".sticker-picker label", text: /Buna House/
    assert_select ".sticker", count: 0
  end

  test "prints a sticker per picked café whose QR carries the café and its source" do
    shop = shops(:bole)
    get console_stickers_path(shop_ids: [ shop.id ])

    assert_response :success
    assert_select ".sticker", count: 1
    assert_select ".sticker svg.qr", count: 1
    assert_select ".sticker__name", text: /Buna House/
  end

  test "prints an A6 table tent per café, the QR on both halves, flagging the unchecked Amharic" do
    get console_stickers_path(shop_ids: [ shops(:bole).id ], format_type: "tent")

    assert_response :success
    assert_select ".tent", count: 1
    assert_select ".tent .tent__panel", count: 2
    assert_select ".tent svg.qr", count: 2
    assert_select ".tent__call", text: "Scan for the menu and your Bunna Passport stamp"
    assert_select ".tent__tagline", text: "the coffee map of Addis"
    assert_select ".panel--warning", text: /Check the Amharic before printing/
  end

  test "makes a tracked link for a post" do
    get console_stickers_path(source: "IG Addis Coffee")

    assert_select ".tracked-link", text: %r{/app\?src=ig-addis-coffee\z}
  end

  test "is for moderators only" do
    sign_in_as users(:one)
    get console_stickers_path

    assert_response :forbidden
  end
end
