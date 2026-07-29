require "test_helper"

class ShopTest < ActiveSupport::TestCase
  test "normalizes bilingual search keys without changing the display names" do
    shop = Shop.new(
      name: "To.Mo.Ca Café",
      name_am: "ቶሞካ ቡና",
      neighborhood: neighborhoods(:bole),
      landmark: "Near the square",
      latitude: 8.9942,
      longitude: 38.7877,
      submitted_by: users(:one)
    )

    shop.validate

    assert_equal "tomoca", shop.name_key
    assert_equal "ቶሞካ", shop.name_am_key
    assert_equal "To.Mo.Ca Café", shop.name
  end

  test "finds a similar name inside 200 metres but not outside it" do
    candidates = Shop.duplicate_candidates(
      name: "Buna Hous",
      name_am: "ሌላ ስም",
      latitude: 8.99425,
      longitude: 38.78772
    )

    assert_includes candidates, shops(:bole)

    far_candidates = Shop.duplicate_candidates(
      name: "Buna Hous",
      name_am: "ሌላ ስም",
      latitude: 9.01,
      longitude: 38.80
    )
    assert_not_includes far_candidates, shops(:bole)
  end

  test "rejects a display name whose normalized key is empty" do
    shop = shops(:bole).dup
    shop.name = "Coffee Café"
    shop.slug = "empty-key"

    assert_not shop.valid?
    assert_includes shop.errors[:name_key], "can't be blank"
  end

  test "merge retains a tombstone and collapses duplicate stamps to the earliest" do
    user = create_user
    winner = shops(:bole)
    loser = Shop.create!(
      name: "Buna Haus",
      name_am: "ሌላ ቡና",
      neighborhood: neighborhoods(:bole),
      landmark: "Beside Buna House",
      latitude: 8.99425,
      longitude: 38.78772,
      status: :live,
      submitted_by: users(:one)
    )

    first = CheckIn.record!(
      user: user, shop: loser, idempotency_key: "loser",
      latitude: loser.latitude, longitude: loser.longitude, accuracy_meters: 10
    )
    travel 5.hours do
      CheckIn.record!(
        user: user, shop: winner, idempotency_key: "winner",
        latitude: winner.latitude, longitude: winner.longitude, accuracy_meters: 10
      )
    end

    assert_difference -> { Stamp.count }, -1 do
      loser.merge_into!(winner, by: users(:two))
    end

    assert loser.reload.merged?
    assert_equal winner, loser.merged_into
    assert_equal first, user.stamps.find_by!(shop: winner).first_check_in
    assert_equal 1, user.reload.stamps_count
    assert_equal 2, winner.reload.check_ins_count
  end

  test "database rejects an unsupported shop status" do
    assert_raises ActiveRecord::StatementInvalid do
      shops(:bole).update_column(:status, "invented")
    end
  end
end
