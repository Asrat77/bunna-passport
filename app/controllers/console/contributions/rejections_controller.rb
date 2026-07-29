class Console::Contributions::RejectionsController < Console::BaseController
  def create
    contribution.reject!(reviewer: Current.user, reason: params.expect(:reason))
    redirect_to console_contribution_path(contribution), notice: "Contribution rejected."
  rescue Contribution::AlreadyReviewed, Contribution::NotAuthorized => error
    redirect_to console_contribution_path(contribution), alert: error.message
  end

  private
    def contribution
      @contribution ||= Contribution.find(params[:contribution_id])
    end
end
