# A moderator adding a photo they took, or one the café sent, straight to the
# catalog without going through the contribution queue.
class Console::Shops::PhotosController < Console::BaseController
  before_action :set_shop

  def create
    photo = @shop.photos.new(image: params.expect(:image), contributor: Current.user)
    if photo.save
      redirect_back_or_to console_shop_path(@shop), notice: "Photo added to #{@shop.name}."
    else
      redirect_back_or_to console_shop_path(@shop), alert: "#{@shop.name}: #{photo.errors.full_messages.to_sentence}"
    end
  end

  private
    def set_shop
      @shop = Shop.find(params[:shop_id])
    end
end
