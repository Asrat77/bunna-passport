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
end
