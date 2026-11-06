# Asks in Telegram how a visit was, with a row of cups to tap, a while after
# a visit nobody rated. One prompt a visit and at most one a day, and only for
# people who left the bot's nudges on.
class SendReviewPromptJob < ApplicationJob
  queue_as :default

  retry_on Telegram::Bot::Error, attempts: 3, wait: :polynomially_longer
  discard_on ActiveJob::DeserializationError

  def perform(check_in)
    user = check_in.user
    return unless Telegram::Bot.configured? && user.bot_chat? && user.daily_nudges?
    return unless check_in.review_promptable?
    return if user.check_ins.where(review_prompted_at: Time.current.all_day).exists?

    Telegram::Bot.new.send_message(chat_id: user.telegram_user_id, **Telegram::Messages.review_prompt(check_in))
    check_in.update_columns(review_prompted_at: Time.current)
  rescue Telegram::Bot::Forbidden
    user.stop_bot_chat!
  end
end
