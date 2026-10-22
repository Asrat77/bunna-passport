# Buckets visit times the way people in Addis live them: local hours,
# Monday-first weeks, and coffee days that start at 04:00 (see User).
module Stats::Clock
  ZONE = User::COFFEE_DAY_ZONE

  module_function

  def local(time)
    time.in_time_zone(ZONE)
  end

  def by_hour(times)
    times.each_with_object(Array.new(24, 0)) { |time, hours| hours[local(time).hour] += 1 }
  end

  # Monday is 0, Sunday is 6.
  def by_weekday(times)
    times.each_with_object(Array.new(7, 0)) { |time, days| days[(local(time).wday + 6) % 7] += 1 }
  end

  def coffee_day(time)
    (local(time) - User::COFFEE_DAY_STARTS_AT.hours).to_date
  end

  def week(time)
    coffee_day(time).beginning_of_week
  end

  # The last `count` calendar months, oldest first, with a cup count for each.
  def by_month(times, now:, count: 6)
    tallies = times.map { |time| local(time).strftime("%Y-%m") }.tally
    current = local(now).to_date.beginning_of_month
    (count - 1).downto(0).map do |back|
      month = (current << back).strftime("%Y-%m")
      { month: month, cups: tallies.fetch(month, 0) }
    end
  end
end
