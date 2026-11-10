require "test_helper"

class Ops::WeeklyReportTest < ActiveSupport::TestCase
  # Monday 10 Nov 2025, 08:45 in Addis: the report covers 3–9 November.
  NOW = Time.find_zone("Africa/Addis_Ababa").local(2025, 11, 10, 8, 45)

  test "covers the last full Monday-to-Monday week in Addis time" do
    report = Ops::WeeklyReport.new(now: NOW)

    zone = Time.find_zone("Africa/Addis_Ababa")
    assert_equal zone.local(2025, 11, 3), report.week.begin
    assert_equal zone.local(2025, 11, 10), report.week.end
    assert_equal zone.local(2025, 10, 27), report.previous_week.begin
    assert_equal zone.local(2025, 11, 3), report.previous_week.end
  end

  test "counts the week and the one before it" do
    baseline = Ops::WeeklyReport.new(now: NOW)
    before_this, before_last = baseline.this_week, baseline.last_week

    travel_to(NOW - 3.days) do
      alice = create_user
      bob = create_user
      Friendship.connect!(alice, bob)
      check_in!(alice, rating: 4)
      check_in!(bob)
    end
    travel_to(NOW - 10.days) { create_user }
    travel_to(NOW + 1.hour) { create_user } # this week, not reported yet

    report = Ops::WeeklyReport.new(now: NOW)
    delta = ->(counts, base) { counts.to_h { |metric, value| [ metric, value - base.fetch(metric) ] } }

    assert_equal({ new_users: 2, check_ins: 2, drinkers: 2, reviews: 1, accepted_invites: 1, new_stamps: 2 },
      delta.(report.this_week, before_this))
    assert_equal 1, report.last_week[:new_users] - before_last[:new_users]
    assert_equal User.where(created_at: ...NOW).count, report.total_users
  end

  test "counts who reached a first stamp within a week of joining" do
    User.update_all(created_at: NOW - 1.year)
    joined = NOW - 12.days # the week before last
    quick, slow = travel_to(joined) { [ create_user, create_user, create_user ].first(2) } # the third never checks in
    travel_to(joined + 2.days) { check_in!(quick) }
    travel_to(joined + 8.days) { check_in!(slow) } # too late to count
    travel_to(NOW - 2.days) { check_in!(create_user) } # joined last week

    report = Ops::WeeklyReport.new(now: NOW)
    assert_equal({ cohort: { joined: 3, stamped: 1 }, so_far: { joined: 1, stamped: 1 } }, report.first_stamps)
    assert_match "1 of 3 (33%) who joined Oct 27–Nov 2; 1 of 1 from last week so far", Telegram::Messages.weekly_report(report)[:text]
  end

  test "says where last week's newcomers came from, stickers by café" do
    User.update_all(created_at: NOW - 1.year)
    travel_to(NOW - 3.days) do
      2.times { create_user(signup_source: "qr-#{shops(:bole).id}") }
      create_user(signup_source: "invite")
      create_user
      create_user(signup_source: "ig-addiscoffee")
    end

    report = Ops::WeeklyReport.new(now: NOW)
    assert_equal [ [ "Buna House sticker", 2 ], [ "direct", 1 ], [ "ig-addiscoffee", 1 ], [ "invite", 1 ] ], report.signup_sources
    assert_match "New people came from:</b> Buna House sticker 2, direct 1, ig-addiscoffee 1, invite 1", Telegram::Messages.weekly_report(report)[:text]
  end

  private
    def check_in!(user, rating: nil)
      shop = shops(:bole)
      CheckIn.record!(
        user: user, shop: shop, idempotency_key: SecureRandom.uuid,
        latitude: shop.latitude, longitude: shop.longitude, accuracy_meters: 10
      ).tap do |check_in|
        assert check_in.verified?, check_in.flag_reason
        check_in.update!(rating: rating) if rating
      end
    end
end
