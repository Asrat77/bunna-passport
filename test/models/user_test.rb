require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "normalizes email and handle" do
    user = create_user(email_address: " PERSON@EXAMPLE.COM ", handle: "@Coffee_Friend")

    assert_equal "person@example.com", user.email_address
    assert_equal "coffee_friend", user.handle
  end

  test "an email account still needs a password" do
    user = User.new(email_address: "nopass@example.com", handle: "no_pass", display_name: "No Pass")

    assert_not user.valid?
    assert user.errors.of_kind?(:password, :blank)
  end

  test "a Telegram account needs neither email nor password" do
    user = User.from_telegram!("id" => 777_000_111, "username" => "Meklit.B", "first_name" => "Meklit", "last_name" => "B")

    assert user.persisted?
    assert_nil user.email_address
    assert_equal "meklitb", user.handle
    assert_equal "Meklit B", user.display_name
    assert_equal user, User.from_telegram!("id" => 777_000_111, "username" => "renamed")
  end

  test "a Telegram account without a usable username gets a free handle" do
    create_user(handle: "tg_42")

    assert_equal "tg_42_2", User.from_telegram!("id" => 42, "first_name" => "ሰላም").handle
  end

  test "the coffee day starts at four in the morning in Addis" do
    # 03:30 in Addis is still the previous coffee day.
    before_dawn = Time.utc(2026, 10, 21, 0, 30)
    assert_equal Time.utc(2026, 10, 20, 1, 0), User.coffee_day_start(before_dawn)

    after_dawn = Time.utc(2026, 10, 21, 1, 30)
    assert_equal Time.utc(2026, 10, 21, 1, 0), User.coffee_day_start(after_dawn)
  end

  test "had a cup today counts accepted visits, flagged ones included, but not rejected" do
    user = create_user
    shop = shops(:bole)
    visit = ->(key, status, at) do
      CheckIn.create!(user: user, shop: shop, idempotency_key: key, occurred_at: at, latitude: shop.latitude,
        longitude: shop.longitude, accuracy_meters: 10, distance_meters: 0, status: status)
    end
    now = Time.utc(2026, 10, 21, 9, 0)

    visit.call("yesterday", :verified, now - 1.day)
    visit.call("rejected", :rejected, now - 1.hour)
    assert_not user.had_cup_today?(now)

    visit.call("flagged", :flagged, now - 1.hour)
    assert user.had_cup_today?(now)
  end

  test "cup status is hidden from boards once someone opts out" do
    user = create_user

    assert_equal true, user.public_cup_status(Set[user.id])
    user.update!(shares_cup_status: false)
    assert_nil user.public_cup_status(Set[user.id])
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
