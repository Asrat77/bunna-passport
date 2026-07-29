require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "normalizes email and handle" do
    user = create_user(email_address: " PERSON@EXAMPLE.COM ", handle: "@Coffee_Friend")

    assert_equal "person@example.com", user.email_address
    assert_equal "coffee_friend", user.handle
  end

  test "promotes a newcomer to regular from verified breadth and volume" do
    user = create_user
    user.update_column(:verified_check_ins_count, 10)
    5.times do |index|
      shop = activity_shop(index)
      CheckIn.create!(
        user: user,
        shop: shop,
        idempotency_key: "trust-#{index}",
        occurred_at: Time.current,
        latitude: shop.latitude,
        longitude: shop.longitude,
        accuracy_meters: 10,
        distance_meters: 0,
        status: :verified,
        verified_at: Time.current,
        counted_at: Time.current
      )
    end

    user.evaluate_trust!

    assert user.reload.regular?
  end

  test "an upheld report demotes the responsible user" do
    responsible = create_user(trust_level: :curator)
    report = Report.create!(
      user: users(:one),
      reportable: responsible,
      reason: :spam,
      note: "Repeated fake submissions"
    )

    report.uphold!(by: users(:two))

    assert responsible.reload.newcomer?
  end

  test "promotes a qualifying regular to curator" do
    user = create_user(trust_level: :regular, verified_check_ins_count: 50)
    20.times do |index|
      shop = activity_shop(index)
      CheckIn.create!(
        user: user,
        shop: shop,
        idempotency_key: "curator-#{index}",
        occurred_at: Time.current,
        latitude: shop.latitude,
        longitude: shop.longitude,
        accuracy_meters: 10,
        distance_meters: 0,
        status: :verified,
        verified_at: Time.current,
        counted_at: Time.current
      )
    end
    5.times do |index|
      Contribution.record!(
        user: user,
        contributable: shops(:bole).edits.build(
          proposed_changes: { landmark: "Curator landmark #{index}" }
        )
      )
    end

    user.evaluate_trust!

    assert user.reload.curator?
  end

  test "only moderators resolve and reverse report decisions" do
    report = Report.create!(
      user: users(:one),
      reportable: shops(:bole),
      reason: :wrong_location
    )
    curator = create_user(trust_level: :curator)

    assert_raises(Report::NotAuthorized) { report.dismiss!(by: curator) }
    report.dismiss!(by: users(:two))
    assert report.dismissed?
    assert_raises(Report::AlreadyReviewed) { report.uphold!(by: users(:two)) }

    report.reverse!(by: users(:two))
    assert report.reload.pending?
  end

  private
    def activity_shop(index)
      Shop.create!(
        name: "Trust Shop #{index}",
        name_am: "የእምነት ሱቅ #{index}",
        neighborhood: neighborhoods(:bole),
        landmark: "Trust fixture #{index}",
        latitude: 8.995 + index.fdiv(10_000),
        longitude: 38.788,
        status: :live,
        submitted_by: users(:one)
      )
    end
end
