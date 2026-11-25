require "test_helper"

class Console::MenuItemsControllerTest < ActionDispatch::IntegrationTest
  setup do
    sign_in_as users(:two)
    @shop = shops(:bole)
  end

  test "adds a line at the end of its category" do
    @shop.menu_items.create!(name: "Buna", category: "coffee", position: 4)

    post console_shop_menu_items_path(@shop), params: { shop_menu_item: { name: " Macchiato ", name_am: "ማኪያቶ", price_birr: 60, category: "coffee" } }

    assert_redirected_to console_shop_menu_items_path(@shop, category: "coffee")
    item = @shop.menu_items.find_by!(name: "Macchiato")
    assert_equal [ "ማኪያቶ", 60, 5, true ], [ item.name_am, item.price_birr, item.position, item.available ]
  end

  test "lists the menu with a form per line" do
    item = @shop.menu_items.create!(name: "Buna", category: "coffee")

    get console_shop_menu_items_path(@shop)

    assert_response :success
    assert_select "form#shop_menu_item_#{item.id}_form"
    assert_select ".menu-table input[value=Buna]"
  end

  test "edits, switches off and removes a line" do
    item = @shop.menu_items.create!(name: "Buna", category: "coffee", price_birr: 40)

    patch console_shop_menu_item_path(@shop, item), params: { shop_menu_item: { price_birr: 45, available: "0" } }
    assert_redirected_to console_shop_menu_items_path(@shop)
    assert_equal [ 45, false ], [ item.reload.price_birr, item.available ]

    delete console_shop_menu_item_path(@shop, item)
    assert_not Shop::MenuItem.exists?(item.id)
  end

  test "refuses a bad price and says why" do
    post console_shop_menu_items_path(@shop), params: { shop_menu_item: { name: "Buna", price_birr: 0, category: "coffee" } }

    assert_response :unprocessable_entity
    assert_select ".flash--alert", text: /Price birr/
  end

  test "is for moderators only" do
    sign_in_as users(:one)
    get console_shop_menu_items_path(@shop)

    assert_response :forbidden
  end
end
