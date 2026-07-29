class Console::Shops::MergesController < Console::BaseController
  before_action :set_shop

  def new
    @candidates = Shop.live.where.not(id: @shop.id).alphabetically
  end

  def create
    winner = Shop.live.find(params.expect(:winner_id))
    @shop.merge_into!(winner, by: Current.user)
    redirect_to console_shop_path(winner), notice: "#{@shop.name} was merged into #{winner.name}."
  rescue Shop::NotAuthorized, ArgumentError => error
    redirect_to new_console_shop_merge_path(@shop), alert: error.message
  end

  private
    def set_shop
      @shop = Shop.find(params[:shop_id])
    end
end
