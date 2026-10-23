require "net/http"

# A thin client for the few Bot API methods the server calls. The token lives
# only here, in the API's environment; the Mini App never sees it.
class Telegram::Bot
  class Error < StandardError; end

  ENDPOINT = "https://api.telegram.org".freeze

  def self.configured?
    ENV["TELEGRAM_BOT_TOKEN"].present?
  end

  def initialize(token: ENV["TELEGRAM_BOT_TOKEN"])
    raise Error, "TELEGRAM_BOT_TOKEN is not set" if token.blank?

    @token = token
  end

  # Stores a message the user can then send to any chat with the Mini App's
  # shareMessage. Returns the prepared message id. Bot API 8.0.
  def save_prepared_inline_message(user_id:, result:)
    call("savePreparedInlineMessage",
      user_id: user_id,
      result: result,
      allow_user_chats: true,
      allow_bot_chats: true,
      allow_group_chats: true,
      allow_channel_chats: true
    ).fetch("id")
  end

  private
    def call(method, params)
      uri = URI("#{ENDPOINT}/bot#{@token}/#{method}")
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 5, read_timeout: 10) do |http|
        http.post(uri.path, params.to_json, "Content-Type" => "application/json")
      end
      body = JSON.parse(response.body)
      # Never echo the URI: it carries the token.
      raise Error, "#{method} failed: #{body['description']}" unless body["ok"]

      body.fetch("result")
    rescue JSON::ParserError, Net::OpenTimeout, Net::ReadTimeout, SocketError, SystemCallError, OpenSSL::SSL::SSLError => error
      raise Error, "#{method} failed: #{error.class}"
    end
end
