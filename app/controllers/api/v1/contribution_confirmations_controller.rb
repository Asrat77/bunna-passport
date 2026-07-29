class Api::V1::ContributionConfirmationsController < Api::V1::BaseController
  def create
    contribution = Contribution.find(params[:contribution_id])
    contribution.confirm!(by: Current.user)
    render_data(contribution_json(contribution.reload), status: :created)
  end
end
