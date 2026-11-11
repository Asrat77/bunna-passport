require "test_helper"

class BadgeAndLeaderboardTest < ActiveSupport::TestCase
  test "badge evaluation awards each definition once" do
    user = create_user(verified_check_ins_count: 1)

    assert_difference -> { user.awards.count }, 1 do
      Badge.evaluate_for(user)
    end
    assert_no_difference -> { user.awards.count } do
      Badge.evaluate_for(user)
    end
    assert_equal badges(:first_cup), user.badges.first
  end

  test "leaderboards materialize verified cups and exclude flagged attempts" do
    first = create_user(created_at: 2.days.ago)
    second = create_user(created_at: 2.days.ago)
    first_visit = create_check_in(first, shops(:bole), :verified, "first-1")
    create_check_in(first, shops(:piassa), :verified, "first-2")
    create_check_in(second, shops(:bole), :verified, "second-1")
    flagged_visit = create_check_in(second, shops(:piassa), :flagged, "second-flagged")
    Stamp.create!(user: first, shop: shops(:bole), first_check_in: first_visit, earned_at: Time.current)
    Stamp.create!(user: second, shop: shops(:piassa), first_check_in: flagged_visit, earned_at: Time.current)

    LeaderboardEntry.refresh!(periods: [ "week" ])

    board = LeaderboardEntry.where(
      scope_key: LeaderboardEntry::CITY_SCOPE,
      period: :week,
      metric: :cups
    ).ranked
    assert_equal [ first.id, second.id ], board.pluck(:user_id)
    assert_equal [ 2, 1 ], board.pluck(:value)

    shops_board = LeaderboardEntry.where(
      scope_key: LeaderboardEntry::CITY_SCOPE,
      period: :week,
      metric: :shops
    ).ranked
    assert_equal [ first.id ], shops_board.pluck(:user_id)
    assert_equal [ 1 ], shops_board.pluck(:value)
  end

  private
    def create_check_in(user, shop, status, key)
      CheckIn.create!(
        user: user,
        shop: shop,
        idempotency_key: key,
        occurred_at: Time.current,
        latitude: shop.latitude,
        longitude: shop.longitude,
        accuracy_meters: 10,
        distance_meters: 0,
        status: status,
        mock_location: status == :flagged,
        verified_at: (Time.current if status == :verified),
        counted_at: (Time.current if status == :verified)
      )
    end

  test "refreshing around a neighbourhood updates its board and the city's, leaving others alone" do
    user = create_user(created_at: 2.days.ago)
    create_check_in(user, shops(:bole), :verified, "around-1")
    piassa = shops(:piassa).neighborhood
    LeaderboardEntry.create!(
      user: user, scope_key: piassa.leaderboard_scope_key, period: :week, metric: :cups,
      period_started_at: Time.current.beginning_of_week, value: 9, rank: 1, refreshed_at: 1.hour.ago
    )

    LeaderboardEntry.refresh_around!(shops(:bole).neighborhood)

    week_cups = LeaderboardEntry.where(period: :week, metric: :cups)
    assert_equal [ user.id ], week_cups.where(scope_key: LeaderboardEntry::CITY_SCOPE).pluck(:user_id)
    assert_equal [ 1 ], week_cups.where(scope_key: shops(:bole).neighborhood.leaderboard_scope_key).pluck(:value)
    assert_equal [ 9 ], week_cups.where(scope_key: piassa.leaderboard_scope_key).pluck(:value)
    assert LeaderboardEntry.where(period: :month, scope_key: LeaderboardEntry::CITY_SCOPE).exists?
    assert_not LeaderboardEntry.where(period: :all_time).exists?
  end
end
