require "test_helper"

class Ops::AlertTest < ActiveJob::TestCase
  test "alerts every moderator who started the bot, once per throttle window" do
    moderator = telegram_user(trust_level: :moderator, telegram_chat_started_at: 1.day.ago)
    telegram_user(trust_level: :moderator)
    telegram_user(telegram_chat_started_at: 1.day.ago)

    bot = with_fake_bot do
      perform_enqueued_jobs do
        assert Ops::Alert.deliver(title: "Boom <script>", details: "app/models/shop.rb:1")
        assert_not Ops::Alert.deliver(title: "Boom <script>", details: "again")
      end
    end

    message = bot.sent.sole
    assert_equal moderator.telegram_user_id, message[:chat_id]
    assert_match "<b>Boom &lt;script&gt;</b>", message[:text]
    assert_match "<pre>app/models/shop.rb:1</pre>", message[:text]
  end

  test "BUNNA_ALERT_CHAT_IDS replaces the moderators" do
    telegram_user(trust_level: :moderator, telegram_chat_started_at: 1.day.ago)

    bot = with_fake_bot(env: { "BUNNA_ALERT_CHAT_IDS" => "111, 222" }) do
      perform_enqueued_jobs { Ops::Alert.deliver(title: "Disk full") }
    end

    assert_equal %w[ 111 222 ], bot.sent.map { |message| message[:chat_id] }
  end

  test "does nothing without a bot" do
    with_env("TELEGRAM_BOT_TOKEN" => nil) do
      assert_no_enqueued_jobs { assert_not Ops::Alert.deliver(title: "Boom") }
    end
  end

  test "a failed send to one chat still reaches the others and never raises" do
    bot = FakeTelegramBot.new(fail_with: Telegram::Bot::Error.new("sendMessage failed"))

    with_fake_bot(bot, env: { "BUNNA_ALERT_CHAT_IDS" => "111" }) do
      assert_nothing_raised { SendOpsAlertJob.perform_now("Boom", "") }
    end
  end

  test "the error subscriber alerts on unhandled errors only" do
    subscriber = Ops::ErrorSubscriber.new
    error = RuntimeError.new("kaput")
    error.set_backtrace([ "#{Rails.root}/app/models/shop.rb:10:in 'x'", "/gems/rack.rb:1" ])

    with_fake_bot(env: { "BUNNA_ALERT_CHAT_IDS" => "111" }) do
      assert_no_enqueued_jobs { subscriber.report(error, handled: true, severity: :warning, context: {}) }
      assert_no_enqueued_jobs do
        subscriber.report(ActiveRecord::RecordNotFound.new("gone"), handled: false, severity: :error, context: {})
      end
      assert_enqueued_with(job: SendOpsAlertJob, args: [ "RuntimeError: kaput", "Where: job CheckHostHealthJob\napp/models/shop.rb:10:in 'x'" ]) do
        subscriber.report(error, handled: false, severity: :error, context: { job: CheckHostHealthJob.new })
      end
    end
  end

  test "the disk check alerts past the warning line" do
    used = 70
    job = CheckHostHealthJob.new
    job.define_singleton_method(:disk_used_percent) { |_path| used }

    with_fake_bot(env: { "BUNNA_ALERT_CHAT_IDS" => "111" }) do
      assert_no_enqueued_jobs { job.perform }
      used = 91
      assert_enqueued_jobs(1, only: SendOpsAlertJob) { job.perform }
    end
  end

  test "df reports a percentage for the storage volume" do
    assert_includes 0..100, CheckHostHealthJob.new.send(:disk_used_percent, Rails.root.to_s)
  end

  private
    def with_env(values)
      previous = values.to_h { |key, _value| [ key, ENV[key] ] }
      values.each { |key, value| ENV[key] = value }
      yield
    ensure
      previous.each { |key, value| ENV[key] = value }
    end
end
