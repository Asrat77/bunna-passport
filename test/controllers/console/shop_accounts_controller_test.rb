require "test_helper"

class Console::ShopAccountsControllerTest < ActionDispatch::IntegrationTest
  setup do
    sign_in_as users(:two)
    @account = ShopAccount.request!(shop: shops(:bole), user: users(:one), note: "I'm the manager")
  end

  test "lists waiting claims with their note" do
    get console_shop_accounts_path

    assert_response :success
    assert_select ".claims-table td", text: "I'm the manager"
  end

  test "approves and rejects" do
    post console_shop_account_approval_path(@account)
    assert_redirected_to console_shop_accounts_path
    assert @account.reload.approved?

    post console_shop_account_rejection_path(@account)
    assert @account.reload.rejected?
  end

  test "is for moderators only" do
    sign_in_as users(:one)
    get console_shop_accounts_path

    assert_response :forbidden
  end
end
