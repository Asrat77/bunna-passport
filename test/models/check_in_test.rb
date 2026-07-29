require "test_helper"

class CheckInTest < ActiveSupport::TestCase
  test "weak GPS is persisted as a rejected attempt without counters" do
    user = create_user

    check_in = record(user: user, accuracy_meters: 101)

    assert check_in.rejected?
    assert_equal "weak_gps", check_in.flag_reason
    assert_equal 0, user.reload.verified_check_ins_count
    assert_equal 0, user.stamps_count
  end

  test "a point outside 250 metres is rejected" do
    check_in = record(user: create_user, latitude: 9.0042, longitude: 38.7877)

    assert check_in.rejected?
    assert_equal "too_far", check_in.flag_reason
  end

  test "same-shop check-ins require four hours" do
    user = create_user(created_at: 2.days.ago)
    first = record(user: user, idempotency_key: "first")
    assert first.verified?

    travel_to first.occurred_at + 3.hours + 59.minutes, with_usec: true do
      second = record(user: user, idempotency_key: "early")
      assert second.rejected?
      assert_equal "cooldown", second.flag_reason
    end

    travel_to first.occurred_at + 4.hours, with_usec: true do
      boundary = record(user: user, idempotency_key: "boundary")
      assert boundary.verified?, "expected verified, got #{boundary.status}: #{boundary.flag_reason}"
    end
  end

  test "idempotency returns the original result" do
    user = create_user(created_at: 2.days.ago)

    assert_difference -> { CheckIn.count }, 1 do
      first = record(user: user, idempotency_key: "same")
      second = record(user: user, idempotency_key: "same")
      assert_equal first, second
    end
    assert_equal 1, user.reload.verified_check_ins_count
    assert_equal 1, user.stamps_count
  end

  test "flagged attempts award a stamp but only clearance applies competitive counters" do
    user = create_user
    flagged = record(user: user, mock_location: true)

    assert flagged.flagged?
    assert_equal "accepted", flagged.public_status
    assert_equal 1, user.reload.stamps_count
    assert_equal 0, user.verified_check_ins_count
    assert_equal 0, shops(:bole).reload.check_ins_count

    flagged.verify!

    assert flagged.reload.verified?
    assert_equal 1, user.reload.verified_check_ins_count
    assert_equal 1, shops(:bole).reload.check_ins_count
    assert_equal 1, user.stamps_count
  end

  test "the fourth first-hour attempt is privately flagged" do
    user = create_user
    first_three = 3.times.map do |index|
      shop = nearby_shop(index)
      CheckIn.record!(
        user: user,
        shop: shop,
        idempotency_key: "new-account-#{index}",
        latitude: shop.latitude,
        longitude: shop.longitude,
        accuracy_meters: 100
      )
    end
    assert first_three.all?(&:verified?)

    fourth_shop = nearby_shop(4)
    fourth = CheckIn.record!(
      user: user,
      shop: fourth_shop,
      idempotency_key: "new-account-4",
      latitude: fourth_shop.latitude,
      longitude: fourth_shop.longitude,
      accuracy_meters: 100
    )

    assert fourth.flagged?
    assert_equal "new_account_velocity", fourth.flag_reason
    assert_equal 3, user.reload.verified_check_ins_count
    assert_equal 4, user.stamps_count
  end

  test "travel faster than 120 kilometres per hour is flagged" do
    user = create_user(created_at: 2.days.ago)
    record(user: user, idempotency_key: "origin")
    far_shop = Shop.create!(
      name: "Far Coffee",
      name_am: "ሩቅ ቡና",
      neighborhood: neighborhoods(:bole),
      landmark: "Far away for a travel test",
      latitude: 10.5,
      longitude: 38.7877,
      status: :live,
      submitted_by: users(:one)
    )

    travel 30.minutes do
      check_in = CheckIn.record!(
        user: user,
        shop: far_shop,
        idempotency_key: "destination",
        latitude: far_shop.latitude,
        longitude: far_shop.longitude,
        accuracy_meters: 10
      )
      assert check_in.flagged?
      assert_equal "implausible_travel", check_in.flag_reason
    end
  end

  test "rejecting a flagged first visit keeps its stamp" do
    user = create_user
    flagged = record(user: user, mock_location: true)

    assert_no_difference -> { Stamp.count } do
      flagged.reject!
    end

    assert flagged.reload.rejected?
    assert_equal 1, user.reload.stamps_count
    assert user.stamps.exists?(shop: shops(:bole))
  end

  test "the ninth daily attempt is rejected" do
    user = create_user(created_at: 2.days.ago)
    shops = 9.times.map { |index| nearby_shop(index) }

    shops.first(8).each_with_index do |shop, index|
      assert CheckIn.record!(
        user: user,
        shop: shop,
        idempotency_key: "daily-#{index}",
        latitude: shop.latitude,
        longitude: shop.longitude,
        accuracy_meters: 10
      ).verified?
    end

    ninth = CheckIn.record!(
      user: user,
      shop: shops.last,
      idempotency_key: "daily-8",
      latitude: shops.last.latitude,
      longitude: shops.last.longitude,
      accuracy_meters: 10
    )
    assert ninth.rejected?
    assert_equal "daily_limit", ninth.flag_reason
  end

  private
    def record(user:, idempotency_key: SecureRandom.uuid, latitude: shops(:bole).latitude,
      longitude: shops(:bole).longitude, accuracy_meters: 10, mock_location: false)
      CheckIn.record!(
        user: user,
        shop: shops(:bole),
        idempotency_key: idempotency_key,
        latitude: latitude,
        longitude: longitude,
        accuracy_meters: accuracy_meters,
        mock_location: mock_location
      )
    end

    def nearby_shop(index)
      Shop.create!(
        name: "Daily Shop #{index}",
        name_am: "የቀን ሱቅ #{index}",
        neighborhood: neighborhoods(:bole),
        landmark: "Daily test #{index}",
        latitude: 8.9942,
        longitude: 38.7877,
        status: :live,
        submitted_by: users(:one)
      )
    end
end
