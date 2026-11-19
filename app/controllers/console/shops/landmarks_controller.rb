class Console::Shops::LandmarksController < Console::BaseController
  before_action :set_shop

  def update
    if @shop.update(landmark: params[:landmark].to_s)
      redirect_back_or_to console_data_gaps_path(neighborhood_id: @shop.neighborhood_id), notice: "Landmark saved for #{@shop.name}."
    else
      redirect_back_or_to console_data_gaps_path(neighborhood_id: @shop.neighborhood_id), alert: "#{@shop.name}: #{@shop.errors.full_messages.to_sentence}"
    end
  end

  private
    def set_shop
      @shop = Shop.find(params[:shop_id])
    end
end
