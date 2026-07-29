class Console::Reports::DismissalsController < Console::BaseController
  def create
    report.dismiss!(by: Current.user)
    redirect_to console_report_path(report), notice: "Report dismissed."
  rescue Report::NotAuthorized, Report::AlreadyReviewed => error
    redirect_to console_report_path(report), alert: error.message
  end

  private
    def report
      @report ||= Report.find(params[:report_id])
    end
end
