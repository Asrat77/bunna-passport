# Tells someone in Telegram whether their claim on a café went through.
class SendShopClaimDecisionJob < ApplicationJob
  queue_as :default

  retry_on Telegram::Bot::Error, attempts: 3, wait: :polynomially_longer
  discard_on ActiveJob::DeserializationError

  def perform(account)
    user = account.user
    return unless Telegram::Bot.configured? && user.bot_chat?
    return if account.pending?

    Telegram::Bot.new.send_message(chat_id: user.telegram_user_id, **Telegram::Messages.shop_claim_decision(account))
  rescue Telegram::Bot::Forbidden
    user.stop_bot_chat!
  end
end
