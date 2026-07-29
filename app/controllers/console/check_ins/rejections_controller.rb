class Console::CheckIns::RejectionsController < Console::BaseController
  def create
    check_in.reject!
    redirect_to console_check_in_path(check_in), notice: "Check-in rejected. Its first-visit stamp was retained."
  rescue CheckIn::InvalidTransition => error
    redirect_to console_check_in_path(check_in), alert: error.message
  end

  private
    def check_in
      @check_in ||= CheckIn.find(params[:check_in_id])
    end
end
