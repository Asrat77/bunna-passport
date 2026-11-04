# Coffee weeks (DESIGN.md §6.4): Monday-first Addis weeks with at least one
# verified cup. Forgiving: this week only breaks a run once it is over
# without a cup.
class Stats::Streak
  def initialize(times, now: Time.current)
    @weeks = times.map { |time| Stats::Clock.week(time) }.to_set
    @this_week = Stats::Clock.week(now)
  end

  def as_json(*)
    { current_weeks: current_weeks, longest_weeks: longest_weeks, this_week: this_week? }
  end

  def this_week?
    @weeks.include?(@this_week)
  end

  def current_weeks
    cursor = this_week? ? @this_week : @this_week - 7
    count = 0
    while @weeks.include?(cursor)
      count += 1
      cursor -= 7
    end
    count
  end

  def longest_weeks
    @weeks.sort.chunk_while { |earlier, later| later == earlier + 7 }.map(&:size).max || 0
  end
end
