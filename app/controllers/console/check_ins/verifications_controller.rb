class Console::CheckIns::VerificationsController < Console::BaseController
  def create
    check_in.verify!
    redirect_to console_check_in_path(check_in), notice: "Check-in verified and counters applied."
  rescue CheckIn::InvalidTransition => error
    redirect_to console_check_in_path(check_in), alert: error.message
  end

  private
    def check_in
      @check_in ||= CheckIn.find(params[:check_in_id])
    end
end
