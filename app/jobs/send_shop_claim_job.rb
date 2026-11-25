# Tells the moderators in Telegram that someone asked to claim a café, with a
# button to the console where they approve or reject it. Goes where
# Ops::Alert goes.
class SendShopClaimJob < ApplicationJob
  queue_as :default

  discard_on ActiveJob::DeserializationError

  def perform(account)
    return unless Telegram::Bot.configured? && account.pending?

    message = Telegram::Messages.shop_claim(account)
    bot = Telegram::Bot.new
    Ops::Alert.chat_ids.each do |chat_id|
      bot.send_message(chat_id: chat_id, **message)
    rescue Telegram::Bot::Error => error
      Rails.logger.error("Café claim notice to #{chat_id} failed: #{error.message}")
    end
  end
end
