# Where Telegram delivers the bot's updates once a webhook is set (see
# `bin/rails bunna:telegram:set_webhook`). Telegram signs each request with
# the secret we gave it, so anything without that header is turned away.
class Telegram::WebhooksController < ActionController::API
  def create
    secret = ENV["TELEGRAM_WEBHOOK_SECRET"].to_s
    given = request.headers["X-Telegram-Bot-Api-Secret-Token"].to_s
    return head :not_found unless Telegram::Bot.configured? && secret.present? &&
      ActiveSupport::SecurityUtils.secure_compare(secret, given)

    # Answer at once: Telegram resends an update it waited too long for.
    TelegramUpdateJob.perform_later(request.request_parameters.except("webhook"))
    head :ok
  end
end
