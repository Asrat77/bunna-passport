# Claiming a café, and which cafés the signed-in person has claimed.
class Api::V1::ShopAccountsController < Api::V1::BaseController
  rate_limit to: 5, within: 1.day, only: :create

  # The person's claims, so a café page can say "Claim sent" or show the
  # owner's tools.
  def index
    render_data(Current.user.shop_accounts.order(:id).map { |account| shop_account_json(account) })
  end

  def create
    shop = Shop.live.find(params[:shop_id])
    account = ShopAccount.request!(shop: shop, user: Current.user, note: params.dig(:shop_account, :note).to_s[0, 500])
    render_data(shop_account_json(account), status: :created)
  end

  private
    def shop_account_json(account)
      { shop_id: account.shop_id, status: account.status, requested_at: account.created_at.iso8601 }
    end
end
