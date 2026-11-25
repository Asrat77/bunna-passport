# Claims on cafés: waiting ones first, then the owners already approved.
class Console::ShopAccountsController < Console::BaseController
  def index
    @pending = ShopAccount.pending.includes(:shop, :user).order(:created_at)
    @decided = ShopAccount.where.not(status: :pending).includes(:shop, :user, :reviewed_by).reverse_chronologically.limit(50)
  end
end
