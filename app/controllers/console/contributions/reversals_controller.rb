class Console::Contributions::ReversalsController < Console::BaseController
  def create
    contribution.reverse!(by: Current.user)
    redirect_to console_contribution_path(contribution), notice: "Decision reversed and returned to the queue."
  rescue Contribution::AlreadyPending, Contribution::NotAuthorized => error
    redirect_to console_contribution_path(contribution), alert: error.message
  end

  private
    def contribution
      @contribution ||= Contribution.find(params[:contribution_id])
    end
end
