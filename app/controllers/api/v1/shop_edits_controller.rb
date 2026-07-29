class Api::V1::ShopEditsController < Api::V1::BaseController
  rate_limit to: 10, within: 1.day, only: :create

  def create
    shop = Shop.live.find(params[:shop_id])
    edit = shop.edits.build(proposed_changes: edit_params[:proposed_changes])
    contribution = Contribution.record!(user: Current.user, contributable: edit)
    render_data(contribution_json(contribution), status: :created)
  end

  private
    def edit_params
      params.expect(shop_edit: [ { proposed_changes: Shop::Edit::EDITABLE_ATTRIBUTES.map(&:to_sym) } ])
    end
end
