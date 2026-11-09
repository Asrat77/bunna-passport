class Console::Contributions::RejectionsController < Console::BaseController
  include Console::Contributions::Queue

  def create
    if reason.blank?
      return redirect_to console_contribution_path(contribution), alert: "Pick a reason or write one. The contributor sees it."
    end

    contribution.reject!(reviewer: Current.user, reason: reason)
    redirect_to after_decision_path, notice: "Rejected “#{contribution.shop_name}”.#{telegram_note("why")}"
  rescue Contribution::AlreadyReviewed, Contribution::NotAuthorized => error
    redirect_to console_contribution_path(contribution), alert: error.message
  end

  private
    # A picked reason, a written note, or both.
    def reason
      [ params[:preset], params[:reason] ].map { |part| part.to_s.strip }.compact_blank.join(" ")
    end
end
