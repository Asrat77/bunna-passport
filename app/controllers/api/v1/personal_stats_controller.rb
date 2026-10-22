class Api::V1::PersonalStatsController < Api::V1::BaseController
  def show
    render_data(Stats::Personal.new(Current.user).as_json)
  end
end
