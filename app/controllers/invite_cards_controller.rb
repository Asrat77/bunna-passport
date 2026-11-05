# Serves a person's invite card (InviteCard) by their invite token, for
# Telegram's servers to fetch when the invite is sent. A rotated token
# stops working here too.
class InviteCardsController < ActionController::API
  def show
    user = User.find_by(invite_token: params[:token].to_s)
    return head :not_found if user.nil? || params[:token].blank?

    response.headers["X-Robots-Tag"] = "noindex"
    expires_in 1.day, public: true
    send_data InviteCard.png_for(user), type: "image/png", disposition: "inline", filename: "bunna-passport-invite.png"
  rescue ShareCard::RenderError => error
    Rails.logger.warn("[invite_cards] #{error.message}")
    head :service_unavailable
  end
end
