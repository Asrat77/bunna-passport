# Each morning, tells the moderators in Telegram how much is waiting in the
# console, followed by the oldest few easy cases with approve and reject
# buttons (see Moderation::Digest and Telegram::ModerationCallback). Nothing
# is sent when every queue is empty. Goes where Ops::Alert goes.
class SendModerationDigestJob < ApplicationJob
  queue_as :default

  def perform
    return unless Telegram::Bot.configured?

    digest = Moderation::Digest.new
    return if digest.empty?

    messages = [ Telegram::Messages.moderation_digest(digest) ] +
      digest.quick_items.map { |item| Telegram::Messages.moderation_item(item) }
    bot = Telegram::Bot.new

    Ops::Alert.chat_ids.each do |chat_id|
      messages.each { |message| bot.send_message(chat_id: chat_id, **message) }
    rescue Telegram::Bot::Error => error
      Rails.logger.error("Moderation digest to #{chat_id} failed: #{error.message}")
    end
  end
end
