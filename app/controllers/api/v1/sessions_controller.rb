class Api::V1::SessionsController < Api::V1::BaseController
  allow_unauthenticated_access only: :create
  rate_limit to: 10, within: 3.minutes, only: :create

  def create
    credentials = params.expect(session: %i[ email_address password ])
    user = User.authenticate_by(credentials)
    return render_error(:unauthorized, "invalid_credentials", "Email address or password is incorrect") unless user

    session, token = Session.start_for(user, ip_address: request.remote_ip, user_agent: request.user_agent)
    render_data(
      { user: user_json(user), token: token, expires_at: session.expires_at.iso8601 },
      status: :created
    )
  end

  def destroy
    Current.session.destroy!
    head :no_content
  end
end
