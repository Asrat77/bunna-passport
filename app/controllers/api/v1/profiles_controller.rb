class Api::V1::ProfilesController < Api::V1::BaseController
  def show
    render_data(user_json(Current.user))
  end

  def update
    Current.user.update!(params.expect(profile: %i[ avatar_seed shares_cup_status shares_visits daily_nudges ]))
    render_data(user_json(Current.user))
  end
end
