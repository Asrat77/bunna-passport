# What the bot says. Text is Telegram HTML, so anything a person or the
# catalog wrote is escaped.
module Telegram::Messages
  LEVEL_MARKS = { "bronze" => "🥉", "silver" => "🥈", "gold" => "🥇", "diamond" => "💎" }.freeze

  COMMANDS = [
    { command: "start", description: "Open your passport" },
    { command: "nudges_off", description: "Stop the daily “had a cup?” nudge" },
    { command: "nudges_on", description: "Turn the daily nudge back on" }
  ].freeze

  NUDGES_OFF = "nudges:off".freeze
  NUDGES_ON = "nudges:on".freeze

  extend self

  def welcome(user)
    text = <<~TEXT
      Selam #{h(user.display_name)} ☕

      Bunna Passport is a stamp book for coffee in Addis. Check in at a café to press its stamp, then keep going back: every cup adds up, and the stamp turns bronze, silver, gold, then diamond.

      Your doodle sleeps until your first cup of the day. #{nudge_line(user)}
    TEXT
    { text: text.strip, reply_markup: keyboard([ app_button("Open Bunna Passport") ]) }
  end

  def nudge(user)
    text = <<~TEXT
      Had a cup today? ☕

      Your doodle is still asleep. Check in at your next buna to wake it up.
    TEXT
    { text: text.strip, reply_markup: keyboard([ app_button("Check in") ], [ callback_button("Stop daily nudges", NUDGES_OFF) ]) }
  end

  # Sent when a counted visit takes a stamp to a level, the first being the
  # new stamp itself. `cups` is the count that visit reached, since the
  # stamp may have moved on by the time this is sent.
  def stamp(stamp, cups)
    level = Stamp.level_reached_at(cups)
    headline = if cups == 1
      "New stamp: <b>#{h(stamp.shop.name)}</b> #{LEVEL_MARKS.fetch(level)}"
    else
      "Your <b>#{h(stamp.shop.name)}</b> stamp is now #{level.capitalize} #{LEVEL_MARKS.fetch(level)}"
    end
    detail = cups == 1 ? "That's stamp #{stamp.user.stamps_count} in your passport." : "#{cups} cups there so far."

    { text: "#{headline}\n\n#{detail} #{next_level_line(cups)}", reply_markup: keyboard([ app_button("Open passport") ]) }
  end

  def nudges_changed(user)
    user.daily_nudges? ? "Daily nudges are on. Send /nudges_off to stop them." : "No more daily nudges. Send /nudges_on to bring them back."
  end

  # Where the Mini App lives. A web_app button needs HTTPS, so without one
  # the bot still talks but offers no button.
  def mini_app_url
    ENV["TELEGRAM_MINI_APP_URL"].presence || ENV["PUBLIC_BASE_URL"].presence
  end

  private
    def nudge_line(user)
      if user.daily_nudges?
        "If it's still asleep in the afternoon, I'll send you one nudge. /nudges_off stops it."
      else
        "Daily nudges are off; /nudges_on brings them back."
      end
    end

    def next_level_line(cups)
      remaining = Stamp.visits_to_next_level(cups)
      return "That's the top level." unless remaining

      next_level = Stamp.level_for(cups + remaining)
      "#{remaining} more #{remaining == 1 ? 'cup' : 'cups'} for #{next_level.capitalize}."
    end

    def keyboard(*rows)
      rows = rows.map(&:compact).reject(&:empty?)
      rows.any? ? { inline_keyboard: rows } : nil
    end

    def app_button(text)
      url = mini_app_url
      url && url.start_with?("https://") ? { text: text, web_app: { url: url } } : nil
    end

    def callback_button(text, data)
      { text: text, callback_data: data }
    end

    def h(text)
      ERB::Util.html_escape(text.to_s)
    end
end
