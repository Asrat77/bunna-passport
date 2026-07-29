class Console::Reports::ReversalsController < Console::BaseController
  def create
    report.reverse!(by: Current.user)
    redirect_to console_report_path(report), notice: "Report decision reversed and returned to the queue."
  rescue Report::NotAuthorized, Report::AlreadyPending => error
    redirect_to console_report_path(report), alert: error.message
  end

  private
    def report
      @report ||= Report.find(params[:report_id])
    end
end
