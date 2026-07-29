require "json"
require "logger"
require "time"

class BunnaPassport::JsonLogFormatter < Logger::Formatter
  def call(severity, time, program_name, message)
    {
      timestamp: time.utc.iso8601(6),
      severity: severity,
      request_id: Current.request_id,
      program: program_name,
      message: message_for(message)
    }.compact.to_json << "\n"
  end

  private
    def message_for(message)
      case message
      when String then message
      when Exception then "#{message.message} (#{message.class})"
      else message.inspect
      end
    end
end
