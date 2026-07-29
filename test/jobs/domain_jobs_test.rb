require "test_helper"

class DomainJobsTest < ActiveJob::TestCase
  test "award job evaluates badge progress" do
    user = create_user(verified_check_ins_count: 1)

    assert_difference -> { Award.count }, 1 do
      AwardBadgesJob.perform_now(user)
    end
  end

  test "trust job evaluates promotion" do
    user = create_user
    user.update_column(:verified_check_ins_count, 10)
    5.times do |index|
      shop = create_shop("Trust Job #{index}")
      CheckIn.create!(
        user: user, shop: shop, idempotency_key: "trust-job-#{index}",
        occurred_at: Time.current, latitude: shop.latitude, longitude: shop.longitude,
        accuracy_meters: 10, distance_meters: 0, status: :verified,
        verified_at: Time.current, counted_at: Time.current
      )
    end

    EvaluateTrustJob.perform_now(user)

    assert user.reload.regular?
  end

  test "leaderboard job refreshes only requested periods" do
    user = create_user
    shop = shops(:bole)
    CheckIn.create!(
      user: user, shop: shop, idempotency_key: "leaderboard-job",
      occurred_at: Time.current, latitude: shop.latitude, longitude: shop.longitude,
      accuracy_meters: 10, distance_meters: 0, status: :verified,
      verified_at: Time.current, counted_at: Time.current
    )

    RefreshLeaderboardsJob.perform_now("week", "month")

    assert LeaderboardEntry.exists?(user: user, period: :week, metric: :cups)
    assert LeaderboardEntry.exists?(user: user, period: :month, metric: :cups)
    assert_not LeaderboardEntry.exists?(user: user, period: :all_time)
  end

  test "jobs are not enqueued when contribution approval rolls back" do
    contribution = Contribution.record!(
      user: users(:one),
      contributable: Shop::Submission.new(
        name: "Rolled Back Coffee",
        name_am: "የተመለሰ ቡና",
        neighborhood: neighborhoods(:bole),
        landmark: "Rollback test",
        latitude: 8.999,
        longitude: 38.792
      )
    )

    assert_no_enqueued_jobs do
      Contribution.transaction do
        contribution.approve!(reviewer: users(:two))
        raise ActiveRecord::Rollback
      end
    end
    assert contribution.reload.pending?
  end

  private
    def create_shop(name)
      Shop.create!(
        name: name,
        name_am: "#{name} ቡና",
        neighborhood: neighborhoods(:bole),
        landmark: "Job test",
        latitude: 8.995,
        longitude: 38.788,
        status: :live,
        submitted_by: users(:one)
      )
    end
end
