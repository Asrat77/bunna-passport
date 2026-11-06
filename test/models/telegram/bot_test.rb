require "test_helper"

class Telegram::BotTest < ActiveSupport::TestCase
  # Answers every call with ok and records each method and its JSON body.
  class FakeHTTP
    attr_reader :calls

    def initialize(result: true)
      @calls = []
      @result = result
    end

    def post(path, body, _headers)
      @calls << [ path.split("/").last, JSON.parse(body) ]
      Struct.new(:body).new({ ok: true, result: @result }.to_json)
    end
  end

  test "sends the webhook, commands and menu button as request bodies" do
    http = FakeHTTP.new
    Net::HTTP.singleton_class.alias_method :original_start, :start
    Net::HTTP.define_singleton_method(:start) { |*, **, &block| block.call(http) }

    bot = Telegram::Bot.new(token: "123:test")
    bot.set_webhook(url: "https://bunna.example/telegram/webhook", secret_token: "s3cret")
    bot.set_my_commands([ { command: "start", description: "Open" } ])
    bot.set_chat_menu_button(text: "Open", url: "https://bunna.example/app")
    bot.set_my_short_description("A coffee passport")
    bot.set_my_description("ቡና ፓስፖርት", language_code: "am")

    methods = http.calls.map(&:first)
    assert_equal %w[ setWebhook setMyCommands setChatMenuButton setMyShortDescription setMyDescription ], methods
    assert_equal({ "short_description" => "A coffee passport" }, http.calls[3].last)
    assert_equal({ "description" => "ቡና ፓስፖርት", "language_code" => "am" }, http.calls[4].last)
    assert_equal "s3cret", http.calls[0].last["secret_token"]
    assert_equal "start", http.calls[1].last.dig("commands", 0, "command")
    assert_equal "https://bunna.example/app", http.calls[2].last.dig("menu_button", "web_app", "url")
  ensure
    Net::HTTP.singleton_class.alias_method :start, :original_start
    Net::HTTP.singleton_class.remove_method :original_start
  end

  test "prepares an inline message and returns its id" do
    http = FakeHTTP.new(result: { id: "prepared-42" })
    Net::HTTP.singleton_class.alias_method :original_start, :start
    Net::HTTP.define_singleton_method(:start) { |*, **, &block| block.call(http) }

    id = Telegram::Bot.new(token: "123:test").save_prepared_inline_message(user_id: 7, result: { type: "photo", id: "x" })

    assert_equal "prepared-42", id
    method, body = http.calls.first
    assert_equal "savePreparedInlineMessage", method
    assert_equal 7, body["user_id"]
    assert_equal "photo", body.dig("result", "type")
  ensure
    Net::HTTP.singleton_class.alias_method :start, :original_start
    Net::HTTP.singleton_class.remove_method :original_start
  end
end
