# Listens to Rails.error and raises an Ops::Alert for each unhandled exception
# in a request or a job. Handled reports (Rails.error.handle, rescued and
# reported on purpose) stay in the logs.
class Ops::ErrorSubscriber
  # Noise a bot or a stale client causes, not a bug in Bunna.
  IGNORED = %w[
    ActionController::RoutingError
    ActionController::UnknownFormat
    ActionController::InvalidAuthenticityToken
    ActionDispatch::Http::MimeNegotiation::InvalidType
    ActiveRecord::RecordNotFound
  ].freeze

  def report(error, handled:, severity:, context:, source: nil)
    return if handled || IGNORED.include?(error.class.name)
    # Telegram itself failing would only report itself again.
    return if context[:job].is_a?(SendOpsAlertJob)

    Ops::Alert.deliver(
      title: "#{error.class}: #{error.message}".squish,
      details: details_for(error, context, source),
      fingerprint: [ error.class.name, Array(error.backtrace).first ].join("|")
    )
  end

  private
    def details_for(error, context, source)
      lines = []
      lines << "Where: #{where(context, source)}"
      lines << "Request: #{context[:request_id]}" if context[:request_id]
      lines.concat(app_backtrace(error).first(8))
      lines.join("\n")
    end

    def where(context, source)
      if (job = context[:job])
        "job #{job.class.name}"
      elsif (controller = context[:controller])
        "#{controller.class.name}##{controller.action_name}"
      else
        source || "unknown"
      end
    end

    def app_backtrace(error)
      backtrace = Array(error.backtrace)
      ours = backtrace.select { |line| line.include?("/app/") || line.include?("/lib/") }
      (ours.presence || backtrace).map { |line| line.sub("#{Rails.root}/", "") }
    end
end
