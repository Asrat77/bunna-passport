require "test_helper"

class StampTest < ActiveSupport::TestCase
  test "the visit that earns the stamp also earns bronze" do
    stamp = stamp_with_visits(1)

    assert_equal "bronze", stamp.level
    assert_equal 1, stamp.check_ins_count
  end

  test "levels rise at their thresholds and not before" do
    { 4 => "bronze", 5 => "silver", 14 => "silver", 15 => "gold", 29 => "gold", 30 => "diamond" }
      .each do |visits, expected|
        assert_equal expected, stamp_with_visits(visits).level, "#{visits} visits"
      end
  end

  test "diamond is the ceiling" do
    stamp = stamp_with_visits(500)

    assert_equal "diamond", stamp.level
    assert_nil stamp.visits_to_next_level
  end

  test "the countdown reports visits still owed" do
    assert_equal 4, stamp_with_visits(1).visits_to_next_level
    assert_equal 10, stamp_with_visits(5).visits_to_next_level
    assert_equal 1, stamp_with_visits(29).visits_to_next_level
  end

  test "each counted check-in raises the level, and replays do not" do
    user = create_user(created_at: 2.days.ago)
    first = check_in(user, "first")

    assert_equal 1, user.stamps.sole.check_ins_count

    # An idempotent replay returns the original row without counting again.
    replayed = check_in(user, "first")
    assert_equal first.id, replayed.id
    assert_equal 1, user.stamps.sole.reload.check_ins_count

    travel_to first.occurred_at + 5.hours, with_usec: true do
      check_in(user, "second")
    end

    assert_equal 2, user.stamps.sole.reload.check_ins_count
    assert_equal "bronze", user.stamps.sole.level
  end

  private
    def stamp_with_visits(count)
      Stamp.new(check_ins_count: count)
    end

    def check_in(user, key)
      CheckIn.record!(
        user: user,
        shop: shops(:bole),
        idempotency_key: key,
        latitude: shops(:bole).latitude,
        longitude: shops(:bole).longitude,
        accuracy_meters: 10,
        mock_location: false
      )
    end
end
