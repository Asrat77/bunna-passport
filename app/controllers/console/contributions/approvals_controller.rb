class Console::Contributions::ApprovalsController < Console::BaseController
  include Console::Contributions::Queue

  def create
    contribution.approve!(reviewer: Current.user)
    redirect_to after_decision_path, notice: "Approved “#{contribution.shop_name}”.#{telegram_note("about it")}"
  rescue Contribution::AlreadyReviewed, Contribution::NotAuthorized => error
    redirect_to console_contribution_path(contribution), alert: error.message
  rescue ActiveRecord::RecordInvalid => error
    redirect_to console_contribution_path(contribution), alert: "Couldn't apply it: #{error.record.errors.full_messages.to_sentence}"
  end
end
