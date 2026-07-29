class Api::V1::ShopPhotosController < Api::V1::BaseController
  rate_limit to: 10, within: 1.day, only: :create

  def create
    shop = Shop.live.find(params[:shop_id])
    submission = Shop::PhotoSubmission.new(photo_params.merge(shop: shop))
    contribution = Contribution.record!(user: Current.user, contributable: submission)
    render_data(contribution_json(contribution), status: :created)
  end

  private
    def photo_params
      params.expect(shop_photo: %i[ caption image ])
    end
end
