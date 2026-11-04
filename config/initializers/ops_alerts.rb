# Unhandled exceptions become Telegram alerts in production (see Ops::Alert).
Rails.application.config.after_initialize do
  Rails.error.subscribe(Ops::ErrorSubscriber.new) if Rails.env.production?
end
