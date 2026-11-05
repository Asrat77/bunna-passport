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

  # A ready-to-send Telegram message with the invite as a native button,
  # for the Mini App's shareMessage. The text comes from the app so it's in
  # the sender's language. No prepared message off Telegram or without a bot;
  # the app then shares the plain link.
  def message
    render_data(invite_json.merge(prepared_message_id: prepare_message))
  end

  private
    def prepare_message
      return unless Current.user.telegram_user_id && Telegram::Bot.configured? && ENV["TELEGRAM_BOT_USERNAME"].present?

      text = params[:text].to_s.strip.first(TEXT_LIMIT)
      button = params[:button].to_s.strip.first(64).presence || "Open Bunna Passport ☕"
      return if text.blank?

      Telegram::Bot.new.save_prepared_inline_message(user_id: Current.user.telegram_user_id, result: {
        type: "article",
        id: "invite-#{Current.user.invite_token!}",
        title: "Bunna Passport",
        description: text.first(100),
        input_message_content: { message_text: text },
        reply_markup: { inline_keyboard: [ [ { text: button, url: invite_url(Current.user) } ] ] }
      })
    rescue Telegram::Bot::Error => error
      Rails.logger.warn("[invites] #{error.message}")
      nil
    end

    def invite_json
      { token: Current.user.invite_token!, url: invite_url(Current.user), friends_count: Current.user.friendships.count }
    end
end
