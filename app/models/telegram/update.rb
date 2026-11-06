# One update from the bot's webhook or from long polling. The bot only talks
# in private chats; group messages and anything else are ignored.
class Telegram::Update
  def initialize(payload, bot: Telegram::Bot.new)
    @payload = payload.respond_to?(:to_unsafe_h) ? payload.to_unsafe_h : payload.to_h
    @payload = @payload.deep_stringify_keys
    @bot = bot
  end

  def handle
    if (message = @payload["message"])
      handle_message(message)
    elsif (callback = @payload["callback_query"])
      handle_callback(callback)
    elsif (member = @payload["my_chat_member"])
      handle_membership(member)
    end
  end

  private
    def handle_message(message)
      return unless message.dig("chat", "type") == "private" && message["from"] && !message.dig("from", "is_bot")

      user = User.from_telegram!(message["from"])
      user.start_bot_chat!

      case command(message["text"])
      when "nudges_off" then set_nudges(user, false, chat_id: message.dig("chat", "id"))
      when "nudges_on" then set_nudges(user, true, chat_id: message.dig("chat", "id"))
      when "friends_off" then set_friend_updates(user, false, chat_id: message.dig("chat", "id"))
      when "friends_on" then set_friend_updates(user, true, chat_id: message.dig("chat", "id"))
      else
        # /start, /help, or anything typed: the answer is always the way in.
        deliver(message.dig("chat", "id"), Telegram::Messages.welcome(user))
      end
    end

    def handle_callback(callback)
      return Telegram::ModerationCallback.new(callback, bot: @bot).handle if callback["data"].to_s.start_with?(Telegram::Messages::MODERATION_PREFIX)
      return Telegram::RatingCallback.new(callback, bot: @bot).handle if callback["data"].to_s.start_with?(Telegram::Messages::RATING_PREFIX)

      user = User.find_by(telegram_user_id: callback.dig("from", "id"))
      user&.adopt_telegram_language(callback.dig("from", "language_code"))
      text = case callback["data"]
      when Telegram::Messages::NUDGES_OFF, Telegram::Messages::NUDGES_ON
        user&.update!(daily_nudges: callback["data"] == Telegram::Messages::NUDGES_ON)
        user && Telegram::Messages.nudges_changed(user)
      when Telegram::Messages::FRIENDS_OFF, Telegram::Messages::FRIENDS_ON
        user&.update!(friend_updates: callback["data"] == Telegram::Messages::FRIENDS_ON)
        user && Telegram::Messages.friend_updates_changed(user)
      end

      @bot.answer_callback_query(callback_query_id: callback["id"], text: text)
    end

    # Telegram reports here when someone blocks the bot or unblocks it.
    def handle_membership(member)
      return unless member.dig("chat", "type") == "private"

      user = User.find_by(telegram_user_id: member.dig("from", "id"))
      return unless user

      case member.dig("new_chat_member", "status")
      when "kicked" then user.stop_bot_chat!
      when "member" then user.start_bot_chat!
      end
    end

    def set_nudges(user, enabled, chat_id:)
      user.update!(daily_nudges: enabled)
      @bot.send_message(chat_id: chat_id, text: Telegram::Messages.nudges_changed(user))
    end

    def set_friend_updates(user, enabled, chat_id:)
      user.update!(friend_updates: enabled)
      @bot.send_message(chat_id: chat_id, text: Telegram::Messages.friend_updates_changed(user))
    end

    def deliver(chat_id, message)
      @bot.send_message(chat_id: chat_id, **message)
    end

    # "/start payload" and "/start@bunnabot" both read as "start".
    def command(text)
      text.to_s[%r{\A/([a-z_]+)}i, 1]&.downcase
    end
end
