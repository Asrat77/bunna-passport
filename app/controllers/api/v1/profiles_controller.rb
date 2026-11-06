class Api::V1::ProfilesController < Api::V1::BaseController
  def show
    render_data(user_json(Current.user))
  end

  def update
    changes = params.expect(profile: [ :avatar_seed, :shares_cup_status, :shares_visits, :daily_nudges, :friend_updates, :language, avatar_traits: {} ]).to_h
    Current.user.update!(changes)
    render_data(user_json(Current.user))
  end
end
