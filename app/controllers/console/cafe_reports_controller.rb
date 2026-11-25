# Numbers for the partner cafés: what their QR stands bring in each week
# (Shop::Scan), for deciding which cafés to keep and how the pilot is going.
class Console::CafeReportsController < Console::BaseController
  WEEKS = 8
  ZONE = User::COFFEE_DAY_ZONE

  def index
    this_week = Time.current.in_time_zone(ZONE).beginning_of_week
    @weeks = (0...WEEKS).map { |ago| (this_week - ago.weeks)...(this_week - (ago - 1).weeks) }
    funnels = @weeks.index_with { |week| Shop::Scan.funnel(week) }
    @shops = Shop.where(id: funnels.values.flat_map(&:keys).uniq).alphabetically
    @funnels = funnels
  end

  # One café's monthly report for its owner, with the text to paste.
  def show
    @shop = Shop.find(params[:id])
    month = Shop::MonthlyReport.parse_month(params[:month])
    @report = month ? Shop::MonthlyReport.new(@shop, month: month) : Shop::MonthlyReport.new(@shop)
    this_month = Time.current.in_time_zone(ZONE).beginning_of_month
    @months = (0..5).map { |ago| this_month - ago.months }
  end
end
