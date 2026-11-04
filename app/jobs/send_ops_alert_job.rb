# Delivers an Ops::Alert. A failure here is logged and dropped: retrying would
# only stack alerts behind whatever is already broken.
class SendOpsAlertJob < ApplicationJob
  queue_as :default

  def perform(title, details)
    return unless Telegram::Bot.configured?

    message = Telegram::Messages.ops_alert(title, details)
    bot = Telegram::Bot.new
    Ops::Alert.chat_ids.each do |chat_id|
      bot.send_message(chat_id: chat_id, **message)
    rescue Telegram::Bot::Error => error
      Rails.logger.error("Ops alert to #{chat_id} failed: #{error.message}")
    end
  end
end
