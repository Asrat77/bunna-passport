class Api::V1::UsersController < Api::V1::BaseController
  allow_unauthenticated_access
  rate_limit to: 5, within: 15.minutes, only: :create,
    with: -> { render_error(:too_many_requests, "rate_limit_exceeded", "Too many signup attempts. Try again later.") }

  def create
    user = User.create!(user_params)
    session, token = Session.start_for(user, ip_address: request.remote_ip, user_agent: request.user_agent)

    render_data(
      { user: user_json(user), token: token, expires_at: session.expires_at.iso8601 },
      status: :created,
      location: api_v1_profile_url
    )
  end

  private
    def user_params
      params.expect(user: %i[
        email_address password password_confirmation handle display_name home_neighborhood_id
      ])
    end
end
