# What the bot says. Text is Telegram HTML, so anything a person or the
# catalog wrote is escaped.
module Telegram::Messages
  LEVEL_MARKS = { "bronze" => "🥉", "silver" => "🥈", "gold" => "🥇", "diamond" => "💎" }.freeze

  COMMANDS = [
    { command: "start", description: "Open your passport" },
    { command: "nudges_off", description: "Stop the daily “had a cup?” nudge" },
    { command: "nudges_on", description: "Turn the daily nudge back on" },
    { command: "friends_off", description: "Stop the evening friends round-up" },
    { command: "friends_on", description: "Turn the friends round-up back on" }
  ].freeze

  # What a new person sees before they ever press Start, such as someone
  # opening a friend's invite link. Keyed by Telegram app language; nil is
  # the default for every other language.
  SHORT_DESCRIPTIONS = {
    nil => "A coffee passport for Addis Ababa. Check in at cafés, collect stamps, and see where your friends drink coffee.",
    "am" => "ለአዲስ አበባ የተሰራ የቡና ፓስፖርት። በካፌዎች ቼክ-ኢን ያድርጉ፣ ማህተም ይሰብስቡ፣ ጓደኞችዎ የት ቡና እንደሚጠጡ ይመልከቱ።"
  }.freeze

  DESCRIPTIONS = {
    nil => "Bunna Passport is a coffee passport for Addis Ababa ☕\n\n" \
      "Check in at cafés to collect a stamp at each one, find new places with hours, prices and reviews, " \
      "and add friends to see where they drink coffee.\n\n" \
      "Opened a friend's invite? Tap Start, then accept their friend request.",
    "am" => "ቡና ፓስፖርት ለአዲስ አበባ የተሰራ የቡና ፓስፖርት ነው ☕\n\n" \
      "በካፌዎች ቼክ-ኢን አድርገው በእያንዳንዱ ማህተም ይሰብስቡ፣ አዳዲስ ቦታዎችን ከሰዓት፣ ከዋጋ እና ከአስተያየቶች ጋር ያግኙ፣ " \
      "ጓደኞችን ጨምረው የት ቡና እንደሚጠጡ ይመልከቱ።\n\n" \
      "የጓደኛ ግብዣ ከፍተዋል? Start የሚለውን ይንኩ፣ ከዚያ የጓደኝነት ጥያቄያቸውን ይቀበሉ።"
  }.freeze

  NUDGES_OFF = "nudges:off".freeze
  NUDGES_ON = "nudges:on".freeze
  FRIENDS_OFF = "friends:off".freeze
  FRIENDS_ON = "friends:on".freeze

  # Rating buttons carry "rate:<check-in id>:<cups>"; see Telegram::RatingCallback.
  RATING_PREFIX = "rate:".freeze

  # Moderation buttons carry "mod:<action>:<id>"; see Telegram::ModerationCallback.
  MODERATION_PREFIX = "mod:".freeze

  FLAG_REASONS = {
    "implausible_travel" => "too fast since their last visit",
    "mock_location" => "the phone reported a mock location",
    "new_account_velocity" => "many visits from a brand new account"
  }.freeze

  EDIT_LABELS = {
    "name" => "Name", "name_am" => "Amharic name", "landmark" => "Landmark",
    "neighborhood_id" => "Neighborhood", "price_band" => "Price", "amenities" => "Amenities"
  }.freeze

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

  def badge(award)
    badge = award.badge
    earned = award.user.awards.count
    text = <<~TEXT
      🏅 Badge earned: <b>#{h(badge.name)}</b>

      #{h(badge.description)} That's #{earned} of #{Badge.count} badges.
    TEXT
    { text: text.strip, reply_markup: keyboard([ app_button("See your badges") ]) }
  end

  # A while after a visit nobody rated: one tap on a cup saves the rating.
  def review_prompt(check_in)
    text = <<~TEXT
      How was <b>#{h(check_in.shop.name)}</b>? ☕

      Tap a cup to rate your visit. It helps the next person pick where to go.
    TEXT
    cups = (1..5).map { |n| callback_button("#{n} ☕", "#{RATING_PREFIX}#{check_in.id}:#{n}") }
    { text: text.strip, reply_markup: keyboard(cups, [ app_button("Add a note or a photo") ]) }
  end

  # The prompt, redrawn once it is answered, so the buttons can't be tapped again.
  def review_thanks(check_in)
    text = <<~TEXT
      You gave <b>#{h(check_in.shop.name)}</b> #{"☕" * check_in.rating.to_i} (#{check_in.rating}/5). Thanks!

      Want to say more? Open the app to add a note, tags or what you paid.
    TEXT
    { text: text.strip, reply_markup: keyboard([ app_button("Open Bunna Passport") ]) }
  end

  # The evening round-up; see Friends::Digest.
  def friend_digest(digest)
    sections = []
    if digest.new_stamps.any?
      lines = digest.new_stamps.map { |check_in| "• #{h(check_in.user.display_name)} stamped <b>#{h(check_in.shop.name)}</b>" }
      sections << "New stamps:\n#{capped(lines).join("\n")}"
    end
    if digest.reactions.any?
      lines = digest.reactions.map do |reaction|
        "• #{h(reaction.user.display_name)} #{reaction.emoji} your <b>#{h(reaction.check_in.shop.name)}</b> visit"
      end
      sections << "On your visits:\n#{capped(lines).join("\n")}"
    end

    text = "☕ <b>Your coffee friends today</b>\n\n#{sections.join("\n\n")}"
    { text: text, reply_markup: keyboard([ app_button("See the feed") ], [ callback_button("Stop friend updates", FRIENDS_OFF) ]) }
  end

  def friend_updates_changed(user)
    if user.friend_updates?
      "The evening friends round-up is on. Send /friends_off to stop it."
    else
      "No more friends round-ups. Send /friends_on to bring them back."
    end
  end

  def nudges_changed(user)
    user.daily_nudges? ? "Daily nudges are on. Send /nudges_off to stop them." : "No more daily nudges. Send /nudges_on to bring them back."
  end

  # For the people running Bunna, not its users: see Ops::Alert.
  def ops_alert(title, details)
    text = "🚨 <b>#{h(title)}</b>"
    text += "\n\n<pre>#{h(details)}</pre>" if details.present?
    { text: text }
  end

  # The morning moderation summary; see Moderation::Digest.
  def moderation_digest(digest)
    contributions = digest.contributions
    counts = Moderation::Digest::CONTRIBUTION_KINDS.map { |type, label| [ contributions.fetch(type), label ] }
    counts << [ digest.reports, "report" ] << [ digest.flagged_check_ins, "flagged check-in" ]
    lines = counts.map { |count, label| "• #{count} #{label.pluralize(count)}" }

    text = "☕ <b>Moderation queue: #{digest.total} waiting</b>\n\n#{lines.join("\n")}"
    quick = digest.quick_items.size
    text += "\n\nThe oldest #{quick == 1 ? 'easy case follows' : "#{quick} easy cases follow"}, with buttons." if quick.positive?
    { text: text, reply_markup: keyboard([ console_button("Open the console", "/console/dashboard") ]) }
  end

  WEEKLY_LABELS = {
    new_users: "new users",
    check_ins: "check-ins",
    drinkers: "people checking in",
    reviews: "reviews",
    accepted_invites: "invites accepted",
    new_stamps: "new stamps"
  }.freeze

  # Monday's numbers for the people running Bunna; see Ops::WeeklyReport.
  def weekly_report(report)
    first = report.week.begin
    last = report.week.end - 1.day
    span = first.month == last.month ? "#{first.strftime('%b %-d')}–#{last.day}" : "#{first.strftime('%b %-d')} – #{last.strftime('%b %-d')}"

    lines = Ops::WeeklyReport::METRICS.map do |metric|
      now, before = report.this_week.fetch(metric), report.last_week.fetch(metric)
      "• <b>#{now}</b> #{WEEKLY_LABELS.fetch(metric)} #{weekly_change(now, before)}"
    end

    text = "📊 <b>Bunna last week (#{span})</b>\n\n#{lines.join("\n")}\n\n#{report.total_users} people have signed up so far."
    { text: text, reply_markup: keyboard([ console_button("Open the console", "/console/dashboard") ]) }
  end

  # One flagged check-in or pending café edit, with its buttons while it is
  # still waiting and the outcome once someone has settled it.
  def moderation_item(record, outcome: nil)
    case record
    when CheckIn then moderation_check_in(record, outcome: outcome)
    when Contribution then moderation_edit(record, outcome: outcome)
    end
  end

  def moderation_check_in(check_in, outcome: nil)
    reason = FLAG_REASONS.fetch(check_in.flag_reason.to_s, check_in.flag_reason.to_s.humanize.downcase.presence || "flagged")
    text = <<~TEXT
      🚩 <b>Flagged check-in at #{h(check_in.shop.name)}</b>
      #{person(check_in.user)}, #{time_ago(check_in.occurred_at)}
      Why: #{h(reason)}
      #{check_in.distance_meters} m from the pin, GPS ±#{check_in.accuracy_meters} m
    TEXT

    buttons = if check_in.flagged? && outcome.nil?
      [ [ callback_button("✅ Verify", "#{MODERATION_PREFIX}ci_ok:#{check_in.id}"), callback_button("❌ Reject", "#{MODERATION_PREFIX}ci_no:#{check_in.id}") ] ]
    else
      []
    end
    buttons << [ console_button("Open in console", "/console/check_ins/#{check_in.id}") ]

    { text: with_outcome(text, outcome), reply_markup: keyboard(*buttons) }
  end

  def moderation_edit(contribution, outcome: nil)
    edit = contribution.contributable
    text = <<~TEXT
      ✏️ <b>Edit to #{h(edit.shop.name)}</b>
      #{person(contribution.user)}, #{time_ago(contribution.created_at)}

      #{edit_lines(edit).join("\n")}
    TEXT

    buttons = if contribution.pending? && outcome.nil?
      [ [ callback_button("✅ Approve", "#{MODERATION_PREFIX}ed_ok:#{contribution.id}"), callback_button("❌ Reject", "#{MODERATION_PREFIX}ed_no:#{contribution.id}") ] ]
    else
      []
    end
    buttons << [ console_button("Open in console", "/console/contributions/#{contribution.id}") ]

    { text: with_outcome(text, outcome), reply_markup: keyboard(*buttons) }
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

    def capped(lines)
      return lines if lines.size <= Friends::Digest::MAX_LINES

      lines.first(Friends::Digest::MAX_LINES) << "• and #{lines.size - Friends::Digest::MAX_LINES} more"
    end

    def keyboard(*rows)
      rows = rows.map(&:compact).reject(&:empty?)
      rows.any? ? { inline_keyboard: rows } : nil
    end

    def app_button(text)
      url = mini_app_url
      url && url.start_with?("https://") ? { text: text, web_app: { url: url } } : nil
    end

    def console_button(text, path)
      base = ENV["PUBLIC_BASE_URL"].to_s
      base.start_with?("https://") ? { text: text, url: "#{base.chomp('/')}#{path}" } : nil
    end

    def weekly_change(now, before)
      return "(same as the week before)" if now == before

      "(#{now > before ? '↑' : '↓'} from #{before})"
    end

    def person(user)
      "#{h(user.display_name)} (@#{h(user.handle)})"
    end

    def time_ago(time)
      "#{ActionController::Base.helpers.time_ago_in_words(time)} ago"
    end

    def with_outcome(text, outcome)
      outcome ? "#{text.strip}\n\n#{h(outcome)}" : text.strip
    end

    # What the edit would change, one line a field, old value first.
    def edit_lines(edit)
      shop = edit.shop
      changes = edit.proposed_changes.to_h.stringify_keys
      lines = []

      if changes.key?("latitude") || changes.key?("longitude")
        meters = shop.distance_from(latitude: changes.fetch("latitude", shop.latitude), longitude: changes.fetch("longitude", shop.longitude))
        lines << "• Pin: moved #{meters.round} m"
      end
      lines << "• Hours: new opening hours" if changes.key?("hours")

      changes.except("latitude", "longitude", "hours").each do |field, value|
        before, after = case field
        when "neighborhood_id" then [ shop.neighborhood&.name, Neighborhood.find_by(id: value)&.name ]
        when "amenities" then [ amenity_list(shop.amenities), amenity_list(value) ]
        else [ shop[field], value ]
        end
        lines << "• #{EDIT_LABELS.fetch(field, field.humanize)}: #{h(before.presence || '—')} → <b>#{h(after.presence || '—')}</b>"
      end

      lines
    end

    def amenity_list(amenities)
      amenities.to_h.select { |_name, present| ActiveModel::Type::Boolean.new.cast(present) }.keys.map(&:humanize).join(", ").presence || "none"
    end

    def callback_button(text, data)
      { text: text, callback_data: data }
    end

    def h(text)
      ERB::Util.html_escape(text.to_s)
    end
end
