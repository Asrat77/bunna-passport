# Records what the bot would send instead of calling Telegram.
class FakeTelegramBot
  attr_reader :sent, :answers

  def initialize(fail_with: nil)
    @sent = []
    @answers = []
    @fail_with = fail_with
  end

  def send_message(**message)
    raise @fail_with if @fail_with

    @sent << message
    { "message_id" => @sent.size }
  end

  def answer_callback_query(**answer)
    @answers << answer
    true
  end
end

module TelegramTestHelper
  # Swaps Telegram::Bot.new for the fake, with a token set so the code under
  # test believes a bot is configured.
  def with_fake_bot(bot = FakeTelegramBot.new, env: {})
    values = { "TELEGRAM_BOT_TOKEN" => "123:test", "TELEGRAM_MINI_APP_URL" => "https://bunna.example" }.merge(env)
    previous = values.to_h { |key, _value| [ key, ENV[key] ] }
    values.each { |key, value| ENV[key] = value }
    original = Telegram::Bot.method(:new)
    Telegram::Bot.define_singleton_method(:new) { |**| bot }
    yield bot
    bot
  ensure
    Telegram::Bot.singleton_class.send(:remove_method, :new)
    previous.each { |key, value| ENV[key] = value }
  end

  def telegram_user(attributes = {})
    create_user({ email_address: nil, password: nil, password_confirmation: nil, telegram_user_id: rand(10**9..10**10) }.merge(attributes))
  end
end

ActiveSupport.on_load(:active_support_test_case) { include TelegramTestHelper }
ActiveSupport.on_load(:action_dispatch_integration_test) { include TelegramTestHelper }
