# One person's friends round-up, when there is anything in it.
class SendFriendDigestJob < ApplicationJob
  queue_as :default

  retry_on Telegram::Bot::Error, attempts: 3, wait: :polynomially_longer
  discard_on ActiveJob::DeserializationError

  def perform(user)
    now = Time.current
    # Checked again here: an opt-out may have landed since the fan-out.
    return unless User.friend_digestable(now).exists?(user.id)

    digest = Friends::Digest.new(user, now: now)
    return if digest.empty?

    Telegram::Bot.new.send_message(chat_id: user.telegram_user_id, **Telegram::Messages.friend_digest(digest))
    # Straight to the column: the message is already out, and an unrelated
    # validation on the user mustn't fail the job after it.
    user.update_column(:last_friend_digest_at, now)
  rescue Telegram::Bot::Forbidden
    user.stop_bot_chat!
  end
end
