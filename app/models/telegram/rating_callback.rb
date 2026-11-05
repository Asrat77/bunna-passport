# A tap on one of the cups under the bot's "how was it?" prompt. Only the
# person who made the visit can rate it, under the same rules as the app: a
# verified visit, still inside the saying window, not rated already.
class Telegram::RatingCallback
  def initialize(callback, bot:)
    @callback = callback
    @bot = bot
    id, rating = callback["data"].to_s.delete_prefix(Telegram::Messages::RATING_PREFIX).split(":", 2)
    @id = Integer(id, exception: false)
    @rating = Integer(rating, exception: false)
  end

  def handle
    user = User.find_by(telegram_user_id: @callback.dig("from", "id"))
    check_in = user && @id && user.check_ins.find_by(id: @id)
    return answer("That button is out of date.") unless check_in && (1..5).cover?(@rating)
    return answer("That visit can't be rated any more.") unless check_in.verified? && check_in.open_for_saying?

    if check_in.rating.nil?
      check_in.update!(rating: @rating)
      answer("Thanks! Saved #{@rating}/5.")
    else
      answer("You already rated this visit #{check_in.rating}/5.")
    end
    redraw(check_in)
  end

  private
    def redraw(check_in)
      message = @callback["message"]
      return unless message

      @bot.edit_message_text(chat_id: message.dig("chat", "id"), message_id: message["message_id"], **Telegram::Messages.review_thanks(check_in))
    rescue Telegram::Bot::Error => error
      Rails.logger.warn("Rating prompt could not be redrawn: #{error.message}")
    end

    def answer(text)
      @bot.answer_callback_query(callback_query_id: @callback["id"], text: text)
    end
end
