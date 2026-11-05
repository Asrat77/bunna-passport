class Api::V1::InvitesController < Api::V1::BaseController
  # The caller's own invite link, to send with a share card or on its own.
  def show
    render_data(invite_json)
  end

  # Revokes the current link and returns a new one. Anyone already a friend
  # stays one.
  def destroy
    Current.user.rotate_invite_token!
    render_data(invite_json)
  end

  TEXT_LIMIT = 500

  # A ready-to-send Telegram message for the Mini App's shareMessage: the
  # sender's invite card (InviteCard) with a short caption and an Accept
  # button that opens their invite link. The caption and button come from
  # the app so they're in the sender's language. No prepared message off Telegram or without a bot;
  # the app then shares the plain link.
  def message
    render_data(invite_json.merge(prepared_message_id: prepare_message))
  end

  private
    def prepare_message
      return unless Current.user.telegram_user_id && Telegram::Bot.configured? && ENV["TELEGRAM_BOT_USERNAME"].present?

      text = params[:text].to_s.strip.first(TEXT_LIMIT)
      button = params[:button].to_s.strip.first(64).presence || "Accept invite"
      return if text.blank?

      card = card_link
      Telegram::Bot.new.save_prepared_inline_message(user_id: Current.user.telegram_user_id, result: {
        type: "photo",
        id: "invite-#{Current.user.invite_token!}",
        photo_url: card,
        thumbnail_url: card,
        caption: text,
        reply_markup: { inline_keyboard: [ [ { text: button, url: invite_url(Current.user) } ] ] }
      })
    rescue Telegram::Bot::Error => error
      Rails.logger.warn("[invites] #{error.message}")
      nil
    end

    # Public, keyed by the invite token. The version changes with the card,
    # so Telegram fetches a new picture instead of reusing its cached one.
    # PUBLIC_BASE_URL is the address Telegram can reach (see ShareCardsController).
    def card_link
      user = Current.user
      version = Digest::SHA256.hexdigest([ InviteCard::VERSION, user.handle, user.avatar_digest ].join(":")).first(10)
      options = { format: :png, v: version }
      if (base = ENV["PUBLIC_BASE_URL"].presence)
        uri = URI(base)
        options.merge!(protocol: uri.scheme, host: uri.host, port: uri.port)
      end
      invite_card_url(user.invite_token!, **options)
    end

    def invite_json
      { token: Current.user.invite_token!, url: invite_url(Current.user), friends_count: Current.user.friendships.count }
    end
end
