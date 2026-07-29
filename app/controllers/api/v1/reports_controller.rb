class Api::V1::ReportsController < Api::V1::BaseController
  rate_limit to: 10, within: 1.day, only: :create

  REPORTABLE_TYPES = {
    "shop" => Shop,
    "photo" => Shop::Photo,
    "check_in" => CheckIn,
    "user" => User
  }.freeze

  def create
    input = report_params
    type = REPORTABLE_TYPES.fetch(input.delete(:reportable_type)) do
      raise ActionController::BadRequest, "Unsupported reportable type"
    end
    reportable = type.find(input.delete(:reportable_id))
    report = Current.user.reports.create!(input.merge(reportable: reportable))
    render_data({ id: report.id, status: report.status }, status: :created)
  end

  private
    def report_params
      params.expect(report: %i[ reportable_type reportable_id reason note ])
    end
end
