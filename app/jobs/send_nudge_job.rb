class SendNudgeJob < ApplicationJob
  queue_as :default

  retry_on Telegram::Bot::Error, attempts: 3, wait: :polynomially_longer
  discard_on ActiveJob::DeserializationError

  def perform(user)
    # Checked again here: a cup or an opt-out may have landed since the fan-out.
    return unless User.nudgeable.exists?(user.id) && !user.had_cup_today?

    Telegram::Bot.new.send_message(chat_id: user.telegram_user_id, **Telegram::Messages.nudge(user))
    user.update!(last_nudged_at: Time.current)
  rescue Telegram::Bot::Forbidden
    user.stop_bot_chat!
  end
end
