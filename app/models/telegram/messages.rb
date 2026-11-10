# What the bot says. Text is Telegram HTML, so anything a person or the
# catalog wrote is escaped.
#
# Messages for Bunna's users come from config/locales/bot.*.yml, in the
# language of the person they go to (User#bot_locale). The moderation and
# ops messages are for the people running Bunna and stay in English.
module Telegram::Messages
  LEVEL_MARKS = { "bronze" => "🥉", "silver" => "🥈", "gold" => "🥇", "diamond" => "💎" }.freeze

  COMMAND_NAMES = %w[start nudges_off nudges_on friends_off friends_on].freeze

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

  # The bot's command menu in one language, for setMyCommands.
  def commands(locale = I18n.default_locale)
    I18n.with_locale(locale) do
      COMMAND_NAMES.map { |name| { command: name, description: I18n.t("bot.commands.#{name}") } }
    end
  end

  # Runs the block in the language of whoever the message is for.
  def in_language_of(user, &block)
    I18n.with_locale(user&.bot_locale || I18n.default_locale, &block)
  end

  def welcome(user)
    in_language_of(user) do
      text = t("welcome.body", name: h(user.display_name), nudge_line: t(user.daily_nudges? ? "welcome.nudges_on" : "welcome.nudges_off"))
      { text: text, reply_markup: keyboard([ app_button(t("buttons.open_app")) ]) }
    end
  end

  def nudge(user)
    in_language_of(user) do
      # No stamp yet, whether an invite brought them or not: point to the
      # first one. The app's first-stamp guide picks the café.
      if user.stamps_count.zero?
        { text: t("first_stamp_nudge"), reply_markup: keyboard([ app_button(t("buttons.find_first_cafe")) ], [ callback_button(t("buttons.stop_nudges"), NUDGES_OFF) ]) }
      else
        { text: t("nudge"), reply_markup: keyboard([ app_button(t("buttons.check_in")) ], [ callback_button(t("buttons.stop_nudges"), NUDGES_OFF) ]) }
      end
    end
  end

  # Sent when a counted visit takes a stamp to a level, the first being the
  # new stamp itself. `cups` is the count that visit reached, since the
  # stamp may have moved on by the time this is sent.
  def stamp(stamp, cups)
    in_language_of(stamp.user) do
      level = Stamp.level_reached_at(cups)
      shop, mark = h(stamp.shop.name), LEVEL_MARKS.fetch(level)
      headline = cups == 1 ? t("stamp.new", shop: shop, mark: mark) : t("stamp.level_up", shop: shop, level: level_name(level), mark: mark)
      detail = cups == 1 ? t("stamp.count", count: stamp.user.stamps_count) : t("stamp.cups_so_far", count: cups)

      { text: "#{headline}\n\n#{detail} #{next_level_line(cups)}", reply_markup: keyboard([ app_button(t("buttons.open_passport")) ]) }
    end
  end

  def badge(award)
    in_language_of(award.user) do
      badge = award.badge
      name = t("badges.#{badge.slug}.name", default: badge.name)
      description = t("badges.#{badge.slug}.description", default: badge.description)
      text = "#{t('badge.earned', name: h(name))}\n\n#{t('badge.tally', description: h(description), count: award.user.awards.count, total: Badge.count)}"
      { text: text, reply_markup: keyboard([ app_button(t("buttons.see_badges")) ]) }
    end
  end

  # Sent when a moderator (or two people confirming a new café) settles
  # something the person sent in. The reason is what the moderator typed, so
  # it is passed on as written; the stock reason from a Telegram button says
  # nothing useful and is left out.
  def contribution_decision(contribution)
    in_language_of(contribution.user) do
      kind = contribution.contributable_type.demodulize.underscore
      outcome = contribution.approved? ? "approved" : "rejected"
      text = t("contribution.#{outcome}.#{kind}", shop: h(contribution.shop_name))

      if contribution.rejected?
        reason = contribution.rejection_reason.to_s.strip
        text += "\n\n#{t('contribution.reason', reason: h(reason))}" if reason.present? && reason != Telegram::ModerationCallback::REJECTION_REASON
        text += "\n\n#{t('contribution.rejected.thanks')}"
      else
        text += "\n\n#{t('contribution.approved.thanks')}"
      end

      { text: text, reply_markup: keyboard([ app_button(t("buttons.open_app")) ]) }
    end
  end

  # A while after a visit nobody rated: one tap on a cup saves the rating.
  def review_prompt(check_in)
    in_language_of(check_in.user) do
      cups = (1..5).map { |n| callback_button("#{n} ☕", "#{RATING_PREFIX}#{check_in.id}:#{n}") }
      { text: t("review.prompt", shop: h(check_in.shop.name)), reply_markup: keyboard(cups, [ app_button(t("buttons.add_note")) ]) }
    end
  end

  # The prompt, redrawn once it is answered, so the buttons can't be tapped again.
  def review_thanks(check_in)
    in_language_of(check_in.user) do
      text = t("review.thanks", shop: h(check_in.shop.name), cups: "☕" * check_in.rating.to_i, rating: check_in.rating)
      { text: text, reply_markup: keyboard([ app_button(t("buttons.open_app")) ]) }
    end
  end

  # Short answers to a tap on a rating cup; see Telegram::RatingCallback.
  def rating_answer(user, key, rating: nil)
    in_language_of(user) { t("review.#{key}", rating: rating) }
  end

  # The evening round-up; see Friends::Digest.
  def friend_digest(digest)
    in_language_of(digest.user) do
      sections = []
      if digest.new_stamps.any?
        lines = digest.new_stamps.map { |check_in| t("friend_digest.stamped", name: h(check_in.user.display_name), shop: h(check_in.shop.name)) }
        sections << "#{t('friend_digest.new_stamps')}\n#{capped(lines).join("\n")}"
      end
      if digest.reactions.any?
        lines = digest.reactions.map do |reaction|
          t("friend_digest.reacted", name: h(reaction.user.display_name), emoji: reaction.emoji, shop: h(reaction.check_in.shop.name))
        end
        sections << "#{t('friend_digest.reactions')}\n#{capped(lines).join("\n")}"
      end

      text = "#{t('friend_digest.title')}\n\n#{sections.join("\n\n")}"
      { text: text, reply_markup: keyboard([ app_button(t("buttons.see_feed")) ], [ callback_button(t("buttons.stop_friend_updates"), FRIENDS_OFF) ]) }
    end
  end

  def friend_updates_changed(user)
    in_language_of(user) { t(user.friend_updates? ? "friend_updates_changed.on" : "friend_updates_changed.off") }
  end

  def nudges_changed(user)
    in_language_of(user) { t(user.daily_nudges? ? "nudges_changed.on" : "nudges_changed.off") }
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

    text = "📊 <b>Bunna last week (#{span})</b>\n\n#{lines.join("\n")}\n\n#{[ weekly_funnel(report), weekly_sources(report) ].compact.join("\n")}\n\n#{report.total_users} people have signed up so far."
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
    def t(key, **options)
      I18n.t("bot.#{key}", **options)
    end

    def level_name(level)
      t("levels.#{level}")
    end

    def next_level_line(cups)
      remaining = Stamp.visits_to_next_level(cups)
      return t("stamp.top_level") unless remaining

      t("stamp.next_level", count: remaining, level: level_name(Stamp.level_for(cups + remaining)))
    end

    def capped(lines)
      return lines if lines.size <= Friends::Digest::MAX_LINES

      lines.first(Friends::Digest::MAX_LINES) << t("friend_digest.and_more", count: lines.size - Friends::Digest::MAX_LINES)
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

    # "First stamp within a week: 6 of 10 (60%) who joined Oct 27–Nov 2;
    # 3 of 8 from last week so far."
    def weekly_funnel(report)
      cohort, so_far = report.first_stamps.values_at(:cohort, :so_far)
      first = report.previous_week.begin
      last = report.previous_week.end - 1.day
      span = first.month == last.month ? "#{first.strftime('%b %-d')}–#{last.day}" : "#{first.strftime('%b %-d')}–#{last.strftime('%b %-d')}"
      line = "🥇 <b>First stamp within a week:</b> #{share(cohort)} who joined #{span}"
      line += "; #{cohort_fraction(so_far)} from last week so far" if so_far[:joined].positive?
      "#{line}."
    end

    def share(counts)
      return "nobody new" if counts[:joined].zero?

      "#{cohort_fraction(counts)} (#{(100.0 * counts[:stamped] / counts[:joined]).round}%)"
    end

    def cohort_fraction(counts)
      "#{counts[:stamped]} of #{counts[:joined]}"
    end

    # "Came from: Tomoca sticker 4, invite 3, direct 2", top five.
    def weekly_sources(report)
      sources = report.signup_sources
      return if sources.empty?

      shown = sources.first(5).map { |label, count| "#{h(label)} #{count}" }
      shown << "others #{sources.drop(5).sum(&:last)}" if sources.size > 5
      "🔗 <b>New people came from:</b> #{shown.join(', ')}"
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
