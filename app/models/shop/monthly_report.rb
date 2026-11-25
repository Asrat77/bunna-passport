# A café's month on Bunna Passport, for its owner: verified check-ins, the
# people behind them (new to the café or coming back), the busiest days of
# the week, and what its QR stand did. Months run on Addis time.
class Shop::MonthlyReport
  ZONE = User::COFFEE_DAY_ZONE
  WEEKDAYS = Date::DAYNAMES.rotate(1) # Monday first, as people in Addis count a week

  attr_reader :shop, :month

  # `month` is any time in the month wanted; the default is last month,
  # which is the one an owner gets sent.
  def initialize(shop, month: Time.current.in_time_zone(ZONE).prev_month)
    @shop = shop
    starts = month.in_time_zone(ZONE).beginning_of_month
    @month = starts...starts.next_month
  end

  def self.parse_month(value)
    Time.find_zone(ZONE).strptime(value.to_s, "%Y-%m") if value.to_s.match?(/\A\d{4}-\d{2}\z/)
  rescue ArgumentError
    nil
  end

  def label
    month.begin.strftime("%B %Y")
  end

  def check_ins
    visits.size
  end

  def previous_check_ins
    @previous_check_ins ||= shop.check_ins.verified.where(occurred_at: (month.begin.prev_month)...month.begin).count
  end

  def visitors
    visitor_ids.size
  end

  # Visitors whose first verified visit here was this month.
  def new_visitors
    @new_visitors ||= visitors - returning_visitors
  end

  # Visitors who had been here before the month began.
  def returning_visitors
    @returning_visitors ||= shop.check_ins.verified.where(user_id: visitor_ids, occurred_at: ...month.begin).distinct.count(:user_id)
  end

  # Check-ins per weekday, Monday first: [["Monday", 4], ...].
  def weekdays
    @weekdays ||= begin
      counts = visits.map { |_, at| at.in_time_zone(ZONE).strftime("%A") }.tally
      WEEKDAYS.map { |day| [ day, counts.fetch(day, 0) ] }
    end
  end

  # The two busiest weekdays that had any check-ins.
  def busiest_days
    weekdays.reject { |_, count| count.zero? }.sort_by.with_index { |(_, count), index| [ -count, index ] }.first(2)
  end

  # { scans:, check_ins:, signups: } from the café's QR stand this month.
  def scans
    @scans ||= Shop::Scan.funnel(month).fetch(shop.id, { scans: 0, check_ins: 0, signups: 0 })
  end

  # For a moderator to paste into Telegram for the owner.
  def to_text
    lines = [ "☕ #{shop.name}: #{label} on Bunna Passport", "" ]
    lines << "• #{pluralize(check_ins, 'verified check-in')} (#{previous_check_ins} the month before)"
    if visitors.positive?
      lines << "• #{pluralize(visitors, 'person', 'people')} came: #{new_visitors} new to you, #{returning_visitors} coming back"
    end
    if busiest_days.any?
      lines << "• Busiest #{busiest_days.size == 1 ? 'day' : 'days'}: #{busiest_days.map { |day, count| "#{day} (#{count})" }.join(', ')}"
    end
    lines << "• #{pluralize(scans[:scans], 'scan')} of your Bunna QR: #{scans[:check_ins]} turned into a check-in, #{scans[:signups]} new to Bunna Passport"
    lines << ""
    lines << "Thank you for being a Bunna Passport café."
    lines.join("\n")
  end

  private
    def visits
      @visits ||= shop.check_ins.verified.where(occurred_at: month).pluck(:user_id, :occurred_at)
    end

    def visitor_ids
      @visitor_ids ||= visits.map(&:first).uniq
    end

    def pluralize(count, singular, plural = nil)
      ActionController::Base.helpers.pluralize(count, singular, plural: plural)
    end
end
