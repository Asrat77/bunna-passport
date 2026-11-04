require "test_helper"

class StatsStreakTest < ActiveSupport::TestCase
  ADDIS = Time.find_zone("Africa/Addis_Ababa")

  test "counts back from last week while this week has no cup yet" do
    # Wednesday 4 Nov 2026; cups in the three weeks before.
    now = ADDIS.local(2026, 11, 4, 12)
    times = [ ADDIS.local(2026, 10, 28, 9), ADDIS.local(2026, 10, 20, 9), ADDIS.local(2026, 10, 13, 9) ]

    streak = Stats::Streak.new(times, now: now)

    assert_equal 3, streak.current_weeks
    assert_not streak.this_week?
  end

  test "a missed week resets the run but keeps the longest" do
    now = ADDIS.local(2026, 11, 4, 12)
    times = [ ADDIS.local(2026, 11, 3, 9), ADDIS.local(2026, 10, 20, 9), ADDIS.local(2026, 10, 13, 9), ADDIS.local(2026, 10, 6, 9) ]

    streak = Stats::Streak.new(times, now: now)

    assert_equal 1, streak.current_weeks
    assert_equal 3, streak.longest_weeks
    assert streak.this_week?
  end

  test "nothing yet is nothing" do
    assert_equal({ current_weeks: 0, longest_weeks: 0, this_week: false }, Stats::Streak.new([]).as_json)
  end
end
