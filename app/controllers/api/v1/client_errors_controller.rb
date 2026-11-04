# Crashes the Mini App reports about itself, so a broken screen on someone's
# phone reaches the operators (see Ops::Alert). Open before sign-in, because
# sign-in is one of the screens that can break; the rate limit keeps it from
# becoming a way to flood the alert chat.
class Api::V1::ClientErrorsController < Api::V1::BaseController
  allow_unauthenticated_access only: :create
  rate_limit to: 20, within: 1.hour, only: :create,
    with: -> { render_error(:too_many_requests, "rate_limit_exceeded", "Too many error reports. Try again later.") }

  def create
    report = report_params
    message = report[:message].to_s.squish.truncate(200)
    raise ActionController::BadRequest, "message is required" if message.blank?

    Rails.logger.warn("Mini App error: #{message} (screen #{report[:screen].presence || 'unknown'})")
    Ops::Alert.deliver(
      title: "Mini App: #{message}",
      details: details_for(report),
      fingerprint: [ "client", message, report[:screen] ].join("|")
    )
    head :no_content
  end

  private
    def report_params
      params.expect(client_error: %i[ message stack screen ])
    end

    def details_for(report)
      user = Session.authenticate(bearer_token)&.user
      [
        "Screen: #{report[:screen].presence || 'unknown'}",
        "User: #{user ? "@#{user.handle} (#{user.id})" : 'signed out'}",
        "Agent: #{request.user_agent.to_s.truncate(160)}",
        report[:stack].to_s.truncate(1_500).presence
      ].compact.join("\n")
    end
end
