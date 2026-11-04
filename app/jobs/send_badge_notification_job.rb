# Tells someone in Telegram they earned a badge, whether a visit, a moderator
# verifying one later, or an accepted contribution earned it.
class SendBadgeNotificationJob < ApplicationJob
  queue_as :default

  retry_on Telegram::Bot::Error, attempts: 3, wait: :polynomially_longer
  discard_on ActiveJob::DeserializationError

  def perform(award)
    user = award.user
    return unless Telegram::Bot.configured? && user.bot_chat?

    Telegram::Bot.new.send_message(chat_id: user.telegram_user_id, **Telegram::Messages.badge(award))
  rescue Telegram::Bot::Forbidden
    user.stop_bot_chat!
  end
end
