class Api::V1::TelegramSessionsController < Api::V1::BaseController
  allow_unauthenticated_access only: :create
  rate_limit to: 20, within: 3.minutes, only: :create,
    with: -> { render_error(:too_many_requests, "rate_limit_exceeded", "Too many sign-in attempts. Try again later.") }

  # Trades Telegram's signed initData for the same bearer token email sign-in
  # issues, creating the account on first launch.
  def create
    init_data = Telegram::InitData.verify!(params.require(:init_data))
    user = User.from_telegram!(init_data.user)

    session, token = Session.start_for(user, ip_address: request.remote_ip, user_agent: request.user_agent)
    render_data(
      { user: user_json(user), token: token, expires_at: session.expires_at.iso8601 },
      status: :created
    )
  rescue Telegram::InitData::Invalid => error
    render_error(:unauthorized, "invalid_init_data", error.message)
  end
end
