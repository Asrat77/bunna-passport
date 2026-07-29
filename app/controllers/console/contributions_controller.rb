class Console::ContributionsController < Console::BaseController
  def index
    @contributions = Contribution
      .includes(:user, :reviewed_by, :contributable, :confirmations)
      .reverse_chronologically
    @contributions = @contributions.where(status: params[:status]) if params[:status].present?
  end

  def show
    @contribution = Contribution.includes(:user, :reviewed_by, :confirmations, :contributable).find(params[:id])
  end
end
