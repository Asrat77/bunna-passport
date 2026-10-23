namespace :bunna do
  namespace :telegram do
    configure_bot = lambda do |bot|
      bot.set_my_commands(Telegram::Messages::COMMANDS)
      url = Telegram::Messages.mini_app_url
      if url&.start_with?("https://")
        bot.set_chat_menu_button(text: "Open", url: url)
      else
        puts "No HTTPS TELEGRAM_MINI_APP_URL or PUBLIC_BASE_URL, so messages go out without an Open button."
      end
    end

    desc "Answer the bot by long polling, for development without a public webhook (Ctrl-C to stop)"
    task poll: :environment do
      abort "Set TELEGRAM_BOT_TOKEN" unless Telegram::Bot.configured?

      bot = Telegram::Bot.new
      # getUpdates refuses to run while a webhook is set.
      bot.delete_webhook
      configure_bot.call(bot)
      puts "Polling for updates. Send /start to the bot."

      offset = nil
      loop do
        bot.get_updates(offset: offset).each do |update|
          offset = update.fetch("update_id") + 1
          puts "update #{update['update_id']}: #{(update.keys - %w[update_id]).join(', ')}"
          Telegram::Update.new(update, bot: bot).handle
        rescue StandardError => error
          warn "update #{update['update_id']} failed: #{error.class}: #{error.message}"
        end
      rescue Telegram::Bot::Error => error
        warn error.message
        sleep 3
      end
    rescue Interrupt
      puts "Stopped."
    end

    desc "Point the bot's webhook at this app (URL=https://host/telegram/webhook, default from PUBLIC_BASE_URL)"
    task set_webhook: :environment do
      abort "Set TELEGRAM_BOT_TOKEN" unless Telegram::Bot.configured?
      abort "Set TELEGRAM_WEBHOOK_SECRET (letters, digits, _ and -)" if ENV["TELEGRAM_WEBHOOK_SECRET"].blank?

      url = ENV["URL"].presence || (ENV["PUBLIC_BASE_URL"].presence && "#{ENV['PUBLIC_BASE_URL'].chomp('/')}/telegram/webhook")
      abort "Set URL or PUBLIC_BASE_URL" unless url

      bot = Telegram::Bot.new
      bot.set_webhook(url: url, secret_token: ENV.fetch("TELEGRAM_WEBHOOK_SECRET"))
      configure_bot.call(bot)
      puts "Webhook set to #{url}"
    end

    desc "Send today's 'had a cup?' nudges now (HANDLE=someone for one person, FORCE=1 to resend today)"
    task nudge: :environment do
      abort "Set TELEGRAM_BOT_TOKEN" unless Telegram::Bot.configured?

      users = ENV["HANDLE"].present? ? User.where(handle: ENV["HANDLE"].delete_prefix("@").downcase) : User.all
      users.update_all(last_nudged_at: nil) if ENV["FORCE"].present?
      sent = 0
      users.merge(User.nudgeable).find_each do |user|
        next if user.had_cup_today?

        SendNudgeJob.perform_now(user)
        sent += 1
      end
      puts "Nudged #{sent} #{sent == 1 ? 'person' : 'people'}."
    end
  end
end
