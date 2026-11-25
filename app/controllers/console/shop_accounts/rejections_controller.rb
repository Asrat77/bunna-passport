class Console::ShopAccounts::RejectionsController < Console::BaseController
  def create
    account = ShopAccount.find(params[:shop_account_id])
    account.reject!(by: Current.user)
    redirect_to console_shop_accounts_path, notice: "Rejected #{account.user.display_name} for #{account.shop.name}."
  end
end
