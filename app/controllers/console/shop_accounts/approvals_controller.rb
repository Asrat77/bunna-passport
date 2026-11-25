class Console::ShopAccounts::ApprovalsController < Console::BaseController
  def create
    account = ShopAccount.find(params[:shop_account_id])
    account.approve!(by: Current.user)
    redirect_to console_shop_accounts_path, notice: "Approved #{account.user.display_name} for #{account.shop.name}."
  end
end
