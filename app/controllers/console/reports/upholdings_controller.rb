class Console::Reports::UpholdingsController < Console::BaseController
  def create
    report.uphold!(by: Current.user)
    redirect_to console_report_path(report), notice: "Report upheld."
  rescue Report::NotAuthorized => error
    redirect_to console_report_path(report), alert: error.message
  end

  private
    def report
      @report ||= Report.find(params[:report_id])
    end
end
