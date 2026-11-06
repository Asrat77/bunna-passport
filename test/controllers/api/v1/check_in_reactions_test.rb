require "test_helper"

class Api::V1::CheckInReactionsTest < ActionDispatch::IntegrationTest
  setup do
    @user = create_user
    @friend = create_user(created_at: 2.days.ago, display_name: "Abebe")
    Friendship.connect!(@user, @friend)
    @visit = visit(@friend)
  end

  test "friends react to a visit in their feed, once each, and can change or take it back" do
    put api_v1_feed_reaction_path(@visit), params: { kind: "coffee" }, headers: bearer_headers(@user), as: :json
    assert_response :success
    assert_equal({ "counts" => [ { "kind" => "coffee", "count" => 1 } ], "mine" => "coffee" }, response_json["data"])

    put api_v1_feed_reaction_path(@visit), params: { kind: "fire" }, headers: bearer_headers(@user), as: :json
    assert_equal [ { "kind" => "fire", "count" => 1 } ], response_json.dig("data", "counts")
    assert_equal 1, CheckInReaction.count

    get api_v1_feed_path, headers: bearer_headers(@user), as: :json
    assert_equal({ "counts" => [ { "kind" => "fire", "count" => 1 } ], "mine" => "fire" }, response_json["data"].sole["reactions"])

    delete api_v1_feed_reaction_path(@visit), headers: bearer_headers(@user), as: :json
    assert_response :success
    assert_equal({ "counts" => [], "mine" => nil }, response_json["data"])
    assert_equal 0, CheckInReaction.count
  end

  test "only visits in your feed take reactions, and only known kinds" do
    stranger = create_user
    put api_v1_feed_reaction_path(@visit), params: { kind: "coffee" }, headers: bearer_headers(stranger), as: :json
    assert_response :not_found

    put api_v1_feed_reaction_path(@visit), params: { kind: "<b>hi</b>" }, headers: bearer_headers(@user), as: :json
    assert_response :unprocessable_entity

    @friend.update!(shares_visits: false)
    put api_v1_feed_reaction_path(@visit), params: { kind: "coffee" }, headers: bearer_headers(@user), as: :json
    assert_response :not_found
    assert_equal 0, CheckInReaction.count
  end

  test "the owner sees who reacted, and only while they are still friends" do
    other = create_user(created_at: 2.days.ago)
    Friendship.connect!(other, @friend)
    put api_v1_feed_reaction_path(@visit), params: { kind: "heart" }, headers: bearer_headers(@user), as: :json
    put api_v1_feed_reaction_path(@visit), params: { kind: "clap" }, headers: bearer_headers(other), as: :json

    get api_v1_feed_path, headers: bearer_headers(@user), as: :json
    assert_equal 2, response_json["data"].sole.dig("reactions", "counts").sum { |row| row["count"] }
    assert_not response_json["data"].sole["reactions"].key?("users")

    get api_v1_reactions_path, headers: bearer_headers(@friend), as: :json
    assert_response :success
    assert_equal [ other.handle, @user.handle ], response_json["data"].map { |row| row.dig("user", "handle") }
    assert_equal shops(:bole).name, response_json["data"].first.dig("check_in", "shop", "name")

    Friendship.disconnect!(other, @friend)
    get api_v1_reactions_path, headers: bearer_headers(@friend), as: :json
    assert_equal [ @user.handle ], response_json["data"].map { |row| row.dig("user", "handle") }
  end

  test "the friends round-up is a profile setting" do
    patch api_v1_profile_path, params: { profile: { friend_updates: false } }, headers: bearer_headers(@user), as: :json
    assert_response :success
    assert_equal false, response_json.dig("data", "friend_updates")
    assert_not @user.reload.friend_updates?
  end

  private
    def visit(user)
      CheckIn.record!(user: user, shop: shops(:bole), idempotency_key: SecureRandom.uuid,
        latitude: shops(:bole).latitude, longitude: shops(:bole).longitude, accuracy_meters: 10)
    end
end
