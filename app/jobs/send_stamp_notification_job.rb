# Tells someone in Telegram that a visit pressed a new stamp or raised one a
# level. Most useful when a moderator verifies a flagged visit later on.
class SendStampNotificationJob < ApplicationJob
  queue_as :default

  retry_on Telegram::Bot::Error, attempts: 3, wait: :polynomially_longer
  discard_on ActiveJob::DeserializationError

  def perform(stamp, cups)
    user = stamp.user
    return unless Telegram::Bot.configured? && user.bot_chat? && Stamp.level_reached_at(cups)

    Telegram::Bot.new.send_message(chat_id: user.telegram_user_id, **Telegram::Messages.stamp(stamp, cups))
  rescue Telegram::Bot::Forbidden
    user.stop_bot_chat!
  end
end
