require "test_helper"

class Api::V1::ChallengeBadgesTest < ActionDispatch::IntegrationTest
  test "a running challenge leads the badge list with its cafés and which are done" do
    badge = Badge.install_challenge!(
      slug: "bole-10", name: "Bole 10", description: "Both cafés.",
      shops: [ shops(:bole), shops(:piassa) ], starts_at: 1.day.ago, ends_at: 1.week.from_now
    )
    user = create_user
    CheckIn.create!(
      user: user, shop: shops(:bole), idempotency_key: "challenge", occurred_at: 1.hour.ago,
      latitude: shops(:bole).latitude, longitude: shops(:bole).longitude, accuracy_meters: 10, distance_meters: 0,
      status: :verified, verified_at: 1.hour.ago
    )

    get api_v1_badges_path, headers: bearer_headers(user), as: :json

    challenge = response_json["data"].first
    assert_equal "bole-10", challenge["slug"]
    assert_equal 1, challenge["progress"]
    assert_equal({ "Buna House" => true, "City Coffee" => false }, challenge.dig("challenge", "shops").to_h { |shop| [ shop["name"], shop["visited"] ] })

    badge.update!(starts_at: 2.weeks.ago, ends_at: 1.day.ago)
    get api_v1_badges_path, headers: bearer_headers(user), as: :json
    assert_not_includes response_json["data"].pluck("slug"), "bole-10", "a finished challenge stays only on the shelves of those who earned it"
  end
end
