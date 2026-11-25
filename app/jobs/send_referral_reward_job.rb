# Tells an inviter in Telegram that a friend they brought in got their first
# stamp, which is when the referral counts.
class SendReferralRewardJob < ApplicationJob
  queue_as :default

  retry_on Telegram::Bot::Error, attempts: 3, wait: :polynomially_longer
  discard_on ActiveJob::DeserializationError

  def perform(friend)
    inviter = friend.referred_by
    return unless inviter && Telegram::Bot.configured? && inviter.bot_chat?

    Telegram::Bot.new.send_message(chat_id: inviter.telegram_user_id, **Telegram::Messages.referral_reward(inviter, friend))
  rescue Telegram::Bot::Forbidden
    inviter.stop_bot_chat!
  end
end
