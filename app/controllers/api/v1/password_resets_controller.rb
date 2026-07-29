class Api::V1::PasswordResetsController < Api::V1::BaseController
  allow_unauthenticated_access
  rate_limit to: 5, within: 15.minutes

  def create
    email_address = params.expect(:email_address)
    PasswordsMailer.reset(user).deliver_later if user = User.find_by(email_address: email_address)
    head :accepted
  end

  def update
    reset = params.expect(password_reset: %i[ token password password_confirmation ])
    user = User.find_by_password_reset_token!(reset[:token])
    user.update!(reset.slice(:password, :password_confirmation))
    user.sessions.destroy_all
    head :no_content
  rescue ActiveSupport::MessageVerifier::InvalidSignature
    render_error(:unprocessable_entity, "invalid_reset_token", "Password reset token is invalid or expired")
  end
end
