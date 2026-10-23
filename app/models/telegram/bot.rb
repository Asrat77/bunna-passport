require "net/http"

# A thin client for the few Bot API methods the server calls. The token lives
# only here, in the API's environment; the Mini App never sees it.
class Telegram::Bot
  class Error < StandardError; end
  # The person blocked the bot or never started it: stop writing to them.
  class Forbidden < Error; end

  ENDPOINT = "https://api.telegram.org".freeze

  # What Telegram::Update knows how to handle; the rest is never delivered.
  UPDATE_TYPES = %w[ message callback_query my_chat_member ].freeze

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

  def send_message(chat_id:, text:, reply_markup: nil)
    params = { chat_id: chat_id, text: text, parse_mode: "HTML", link_preview_options: { is_disabled: true } }
    params[:reply_markup] = reply_markup if reply_markup
    call("sendMessage", params)
  end

  def answer_callback_query(callback_query_id:, text: nil)
    call("answerCallbackQuery", { callback_query_id: callback_query_id, text: text }.compact)
  end

  # Long polling for local development, where Telegram can't reach a webhook.
  # Holds the connection open for up to `timeout` seconds.
  def get_updates(offset:, timeout: 30, allowed_updates: UPDATE_TYPES)
    call("getUpdates", { offset: offset, timeout: timeout, allowed_updates: allowed_updates }, read_timeout: timeout + 10)
  end

  def set_webhook(url:, secret_token:, allowed_updates: UPDATE_TYPES)
    call("setWebhook", url: url, secret_token: secret_token, allowed_updates: allowed_updates)
  end

  def delete_webhook
    call("deleteWebhook", {})
  end

  def set_my_commands(commands)
    call("setMyCommands", commands: commands)
  end

  # The button beside the message box that opens the Mini App.
  def set_chat_menu_button(text:, url:)
    call("setChatMenuButton", menu_button: { type: "web_app", text: text, web_app: { url: url } })
  end

  private
    def call(method, params, read_timeout: 10)
      uri = URI("#{ENDPOINT}/bot#{@token}/#{method}")
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 5, read_timeout: read_timeout) do |http|
        http.post(uri.path, params.to_json, "Content-Type" => "application/json")
      end
      body = JSON.parse(response.body)
      # Never echo the URI: it carries the token.
      unless body["ok"]
        error_class = body["error_code"] == 403 ? Forbidden : Error
        raise error_class, "#{method} failed: #{body['description']}"
      end

      body.fetch("result")
    rescue JSON::ParserError, Net::OpenTimeout, Net::ReadTimeout, SocketError, SystemCallError, OpenSSL::SSL::SSLError => error
      raise Error, "#{method} failed: #{error.class}"
    end
end
