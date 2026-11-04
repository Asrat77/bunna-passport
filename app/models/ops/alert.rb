# Tells the people running Bunna, in Telegram, that something broke: an
# unhandled exception, a Mini App crash, a filling disk. Nothing else watches
# production, so this is how a problem gets noticed before a user mentions it.
#
# Alerts go to BUNNA_ALERT_CHAT_IDS (comma separated Telegram ids) when that is
# set, and otherwise to every moderator who has started the bot. The same
# problem is announced once per throttle window, so a crash loop sends one
# message rather than hundreds.
class Ops::Alert
  DEFAULT_THROTTLE = 1.hour

  class << self
    # Returns whether an alert was queued. Never raises: a broken alert must
    # not turn into a second failure for the request or job that hit the first.
    def deliver(title:, details: nil, fingerprint: title, throttle: DEFAULT_THROTTLE)
      return false unless Telegram::Bot.configured?

      key = "ops_alert/#{Digest::SHA256.hexdigest(fingerprint.to_s)}"
      return false if Rails.cache.exist?(key)

      Rails.cache.write(key, true, expires_in: throttle)
      SendOpsAlertJob.perform_later(title.to_s.truncate(200), details.to_s.truncate(3_000))
      true
    rescue StandardError => error
      Rails.logger.error("Ops alert could not be queued: #{error.class}: #{error.message}")
      false
    end

    def chat_ids
      configured = ENV["BUNNA_ALERT_CHAT_IDS"].to_s.split(",").map(&:strip).compact_blank
      return configured if configured.any?

      User.moderator.where.not(telegram_user_id: nil).where.not(telegram_chat_started_at: nil).pluck(:telegram_user_id)
    end
  end
end
