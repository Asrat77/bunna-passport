class Console::ReportsController < Console::BaseController
  def index
    @reports = Report.includes(:user, :reportable, :reviewed_by).reverse_chronologically
    @reports = @reports.where(status: params[:status]) if params[:status].present?
  end

  def show
    @report = Report.includes(:user, :reportable, :reviewed_by).find(params[:id])
  end
end
