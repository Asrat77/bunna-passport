# Monday morning: last week's numbers to the people running Bunna, in
# Telegram (see Ops::WeeklyReport). Goes where Ops::Alert goes.
class SendWeeklyReportJob < ApplicationJob
  queue_as :default

  def perform
    return unless Telegram::Bot.configured?

    message = Telegram::Messages.weekly_report(Ops::WeeklyReport.new)
    bot = Telegram::Bot.new

    Ops::Alert.chat_ids.each do |chat_id|
      bot.send_message(chat_id: chat_id, **message)
    rescue Telegram::Bot::Error => error
      Rails.logger.error("Weekly report to #{chat_id} failed: #{error.message}")
    end
  end
end
