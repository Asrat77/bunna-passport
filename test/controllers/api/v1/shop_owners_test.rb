require "test_helper"

class Api::V1::ShopOwnersTest < ActionDispatch::IntegrationTest
  setup do
    @shop = shops(:bole)
    @owner = users(:one)
  end

  test "claims a café and lists the claim" do
    post api_v1_shop_claim_path(@shop), params: { shop_account: { note: "Manager, 0911 000000" } }, headers: bearer_headers(@owner), as: :json

    assert_response :created
    assert_equal({ "shop_id" => @shop.id, "status" => "pending" }, response_json["data"].except("requested_at"))

    get api_v1_shop_accounts_path, headers: bearer_headers(@owner), as: :json
    assert_equal [ @shop.id ], response_json["data"].map { |account| account["shop_id"] }
  end

  test "an approved owner keeps the menu; anyone else can't" do
    get api_v1_shop_menu_items_path(@shop), headers: bearer_headers(@owner), as: :json
    assert_response :forbidden

    ShopAccount.request!(shop: @shop, user: @owner).approve!(by: users(:two))

    post api_v1_shop_menu_items_path(@shop), params: { menu_item: { name: "Macchiato", name_am: "ማኪያቶ", price_birr: 60, category: "coffee" } },
      headers: bearer_headers(@owner), as: :json
    assert_response :created
    id = response_json.dig("data", "id")
    assert_equal [ 1, true ], response_json["data"].values_at("position", "available")

    patch api_v1_shop_menu_item_path(@shop, id), params: { menu_item: { available: false } }, headers: bearer_headers(@owner), as: :json
    assert_response :success
    get api_v1_shop_path(@shop), as: :json
    assert_empty response_json.dig("data", "menu")

    get api_v1_shop_menu_items_path(@shop), headers: bearer_headers(@owner), as: :json
    assert_equal [ false ], response_json["data"].map { |item| item["available"] }

    delete api_v1_shop_menu_item_path(@shop, id), headers: bearer_headers(@owner), as: :json
    assert_response :no_content
    assert_empty @shop.menu_items.reload
  end

  test "an owner can't touch another café's menu" do
    ShopAccount.request!(shop: @shop, user: @owner).approve!(by: users(:two))

    post api_v1_shop_menu_items_path(shops(:piassa)), params: { menu_item: { name: "Buna", category: "coffee" } }, headers: bearer_headers(@owner), as: :json
    assert_response :forbidden
  end
end
