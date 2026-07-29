require "test_helper"

class ContributionTest < ActiveSupport::TestCase
  test "two independent curators approve a newcomer shop" do
    newcomer = create_user
    first_curator = create_user(trust_level: :curator)
    second_curator = create_user(trust_level: :curator)
    contribution = Contribution.record!(user: newcomer, contributable: submission)

    assert contribution.pending?
    assert_no_difference -> { Shop.count } do
      contribution.confirm!(by: first_curator)
    end
    assert_difference -> { Shop.count }, 1 do
      contribution.confirm!(by: second_curator)
    end

    assert contribution.reload.approved?
    assert contribution.shop_submission.created_shop.live?
  end

  test "a contributor cannot confirm their own proposal" do
    curator = create_user(trust_level: :curator)
    contribution = Contribution.record!(user: create_user, contributable: submission)

    assert_raises Contribution::NotAuthorized do
      contribution.confirm!(by: contribution.user)
    end
    assert contribution.confirmable_by?(curator)
  end

  test "regular edits auto apply while new shops remain pending" do
    regular = create_user(trust_level: :regular)
    edit = shops(:bole).edits.build(proposed_changes: { landmark: "Across from the new landmark" })

    contribution = Contribution.record!(user: regular, contributable: edit)

    assert contribution.auto_approved?
    assert_equal "Across from the new landmark", shops(:bole).reload.landmark

    new_shop = Contribution.record!(user: regular, contributable: submission(name: "Regular Proposal", name_am: "የተጠቃሚ ሀሳብ"))
    assert new_shop.pending?
  end

  test "forced near matches always stay in moderation" do
    curator = create_user(trust_level: :curator)
    near_match = submission(
      name: shops(:bole).name,
      name_am: shops(:bole).name_am,
      latitude: shops(:bole).latitude,
      longitude: shops(:bole).longitude,
      duplicate_override: true
    )

    contribution = Contribution.record!(user: curator, contributable: near_match)

    assert contribution.pending?
  end

  test "newcomers are limited to two daily contributions" do
    newcomer = create_user
    2.times do |index|
      Contribution.record!(
        user: newcomer,
        contributable: submission(name: "Proposal #{index}", name_am: "ሀሳብ #{index}")
      )
    end

    assert_raises Contribution::DailyLimitExceeded do
      Contribution.record!(user: newcomer, contributable: submission(name: "Third Proposal", name_am: "ሶስተኛ"))
    end
  end

  test "invalid weekly hours are rejected before moderation" do
    proposal = submission(hours: { monday: [ { opens: "25:00", closes: "later" } ] })

    assert_not proposal.valid?
    assert_match "invalid opening intervals", proposal.errors[:hours].to_sentence
  end

  private
    def submission(overrides = {})
      Shop::Submission.new({
        name: "New Coffee",
        name_am: "አዲስ ቡና",
        neighborhood: neighborhoods(:bole),
        landmark: "Behind the community hall",
        latitude: 8.9990,
        longitude: 38.7900,
        amenities: { "wifi" => true }
      }.merge(overrides))
    end
end
