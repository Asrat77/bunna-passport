class Api::V1::CityStatsController < Api::V1::BaseController
  allow_unauthenticated_access

  def show
    render_data(Stats::City.cached)
  end
end
