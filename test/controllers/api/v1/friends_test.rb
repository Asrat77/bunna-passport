require "test_helper"

class Api::V1::FriendsTest < ActionDispatch::IntegrationTest
  test "accepting an invite link makes both people friends" do
    inviter = create_user(avatar_seed: "inviter")
    guest = create_user

    get api_v1_invite_path, headers: bearer_headers(inviter), as: :json
    assert_response :success
    token = response_json.dig("data", "token")
    assert_equal "http://www.example.com/?invite=#{token}", response_json.dig("data", "url")

    get api_v1_invite_preview_path(token), headers: bearer_headers(guest), as: :json
    assert_equal inviter.handle, response_json.dig("data", "inviter", "handle")
    assert_equal false, response_json.dig("data", "already_friends")

    post api_v1_friends_path, params: { invite_token: token }, headers: bearer_headers(guest), as: :json
    assert_response :created
    assert_equal "inviter", response_json.dig("data", "avatar_seed")
    assert_nil response_json.dig("data", "email_address")

    post api_v1_friends_path, params: { invite_token: token }, headers: bearer_headers(guest), as: :json
    assert_response :ok

    get api_v1_friends_path, headers: bearer_headers(inviter), as: :json
    assert_equal [ guest.handle ], response_json["data"].pluck("handle")
    get api_v1_friends_path, headers: bearer_headers(guest), as: :json
    assert_equal [ inviter.handle ], response_json["data"].pluck("handle")
  end

  test "invite links point at the Mini App once there is a bot" do
    user = create_user

    with_env("TELEGRAM_BOT_USERNAME" => "@bunna_bot", "TELEGRAM_MINI_APP_NAME" => nil) do
      get api_v1_invite_path, headers: bearer_headers(user), as: :json
    end
    assert_equal "https://t.me/bunna_bot?startapp=invite_#{user.reload.invite_token}", response_json.dig("data", "url")

    with_env("TELEGRAM_BOT_USERNAME" => "bunna_bot", "TELEGRAM_MINI_APP_NAME" => "passport") do
      get api_v1_invite_path, headers: bearer_headers(user), as: :json
    end
    assert_equal "https://t.me/bunna_bot/passport?startapp=invite_#{user.invite_token}", response_json.dig("data", "url")
  end

  test "your own link and unknown links don't make friends" do
    user = create_user
    token = user.invite_token!

    post api_v1_friends_path, params: { invite_token: token }, headers: bearer_headers(user), as: :json
    assert_response :unprocessable_entity
    assert_equal "own_invite", response_json["code"]

    post api_v1_friends_path, params: { invite_token: "nope" }, headers: bearer_headers(user), as: :json
    assert_response :not_found
    assert_equal 0, Friendship.count
  end

  test "a revoked link stops working but keeps existing friends" do
    inviter = create_user
    friend = create_user
    old_token = inviter.invite_token!
    Friendship.connect!(friend, inviter)

    delete api_v1_invite_path, headers: bearer_headers(inviter), as: :json
    assert_response :success
    assert_not_equal old_token, response_json.dig("data", "token")

    post api_v1_friends_path, params: { invite_token: old_token }, headers: bearer_headers(create_user), as: :json
    assert_response :not_found
    assert_equal [ friend ], inviter.friends.to_a
  end

  test "removing a friend removes both sides" do
    user = create_user
    friend = create_user
    Friendship.connect!(user, friend)

    delete api_v1_friend_path(friend), headers: bearer_headers(user), as: :json
    assert_response :no_content
    assert_equal 0, Friendship.count

    delete api_v1_friend_path(friend), headers: bearer_headers(user), as: :json
    assert_response :not_found
  end

  test "the feed shows friends' verified visits by coffee day only" do
    user = create_user
    friend = create_user(created_at: 2.days.ago)
    stranger = create_user(created_at: 2.days.ago)
    Friendship.connect!(user, friend)
    visit = visit(friend, drink: "Macchiato", rating: 5)
    visit(stranger)
    visit(friend, key: "far", latitude: 9.1, longitude: 38.9)

    get api_v1_feed_path, headers: bearer_headers(user), as: :json
    assert_response :success
    items = response_json["data"]
    assert_equal [ visit.id ], items.pluck("id")
    item = items.first
    assert_equal friend.handle, item.dig("user", "handle")
    assert_equal shops(:bole).name, item.dig("shop", "name")
    assert_equal User.coffee_day_start(visit.occurred_at).to_date.iso8601, item["coffee_day"]
    assert_equal true, item["stamp_earned"]
    assert_equal "bronze", item["stamp_level"]
    assert_equal "Macchiato", item["drink"]
    assert_equal true, item.dig("user", "had_cup_today")
    %w[ occurred_at latitude longitude distance_meters status ].each { |field| assert_not item.key?(field), field }
  end

  test "friends who stop sharing visits drop out of the feed" do
    user = create_user
    friend = create_user(created_at: 2.days.ago, shares_visits: false)
    Friendship.connect!(user, friend)
    visit(friend)

    get api_v1_feed_path, headers: bearer_headers(user), as: :json
    assert_empty response_json["data"]

    patch api_v1_profile_path, params: { profile: { shares_visits: true } }, headers: bearer_headers(friend), as: :json
    assert_equal true, response_json.dig("data", "shares_visits")
    get api_v1_feed_path, headers: bearer_headers(user), as: :json
    assert_equal 1, response_json["data"].size
  end

  test "the feed pages with a cursor" do
    user = create_user
    friend = create_user(created_at: 2.days.ago)
    Friendship.connect!(user, friend)
    first = travel(-5.hours) { visit(friend, key: "one") }
    visit(friend, key: "two")

    get api_v1_feed_path, params: { limit: 1 }, headers: bearer_headers(user)
    cursor = response_json.dig("meta", "next_cursor")
    assert cursor

    get api_v1_feed_path, params: { limit: 1, cursor: cursor }, headers: bearer_headers(user)
    assert_equal [ first.id ], response_json["data"].pluck("id")
  end

  test "the friends board ranks you among your friends" do
    user = create_user
    friend = create_user
    stranger = create_user
    Friendship.connect!(user, friend)
    { stranger => 9, friend => 5, user => 2 }.each_with_index do |(person, value), index|
      LeaderboardEntry.create!(user: person, scope_key: LeaderboardEntry::CITY_SCOPE, period: :week, metric: :cups,
        period_started_at: Time.current.beginning_of_week, value: value, rank: index + 1, refreshed_at: Time.current)
    end

    get api_v1_leaderboards_path, params: { scope: "friends" }, as: :json
    assert_response :unauthorized

    get api_v1_leaderboards_path, params: { scope: "friends" }, headers: bearer_headers(user), as: :json
    assert_response :success
    assert_equal [ [ 1, friend.handle ], [ 2, user.handle ] ], response_json["data"].map { |entry| [ entry["rank"], entry.dig("user", "handle") ] }
  end

  private
    def visit(user, key: SecureRandom.uuid, latitude: shops(:bole).latitude, longitude: shops(:bole).longitude, **sayings)
      CheckIn.record!(user: user, shop: shops(:bole), idempotency_key: key,
        latitude: latitude, longitude: longitude, accuracy_meters: 10, **sayings)
    end
end
