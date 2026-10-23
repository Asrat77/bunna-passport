class TelegramUpdateJob < ApplicationJob
  queue_as :default

  def perform(payload)
    Telegram::Update.new(payload).handle
  end
end
