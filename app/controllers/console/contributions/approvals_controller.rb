class Console::Contributions::ApprovalsController < Console::BaseController
  def create
    contribution.approve!(reviewer: Current.user)
    redirect_to console_contribution_path(contribution), notice: "Contribution approved."
  rescue Contribution::AlreadyReviewed, Contribution::NotAuthorized => error
    redirect_to console_contribution_path(contribution), alert: error.message
  end

  private
    def contribution
      @contribution ||= Contribution.find(params[:contribution_id])
    end
end
