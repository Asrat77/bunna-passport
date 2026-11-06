require "test_helper"

class SendFriendDigestsJobTest < ActiveJob::TestCase
  setup do
    @user = telegram_user(telegram_chat_started_at: 2.days.ago)
    @friend = telegram_user(telegram_chat_started_at: 2.days.ago, created_at: 2.days.ago, display_name: "Abebe")
    Friendship.connect!(@user, @friend)
  end

  test "sends one evening round-up of friends' new stamps and reactions, once a coffee day" do
    visit = visit(@friend)
    mine = visit(@user)
    CheckInReaction.create!(check_in: mine, user: @friend, kind: "coffee")

    bot = with_fake_bot do
      perform_enqueued_jobs { SendFriendDigestsJob.perform_now }
      perform_enqueued_jobs { SendFriendDigestsJob.perform_now }
    end

    to_user = bot.sent.select { |message| message[:chat_id] == @user.telegram_user_id }
    text = to_user.sole[:text]
    assert_match "Abebe stamped <b>#{visit.shop.name}</b>", text
    assert_match "Abebe ☕ your <b>#{mine.shop.name}</b> visit", text
    assert_equal Telegram::Messages::FRIENDS_OFF, to_user.sole[:reply_markup][:inline_keyboard].dig(1, 0, :callback_data)
    assert @user.reload.last_friend_digest_at
    # The friend hears about the user's new stamp too, in their own one message.
    assert_equal 1, bot.sent.count { |message| message[:chat_id] == @friend.telegram_user_id }
  end

  test "says nothing when nothing happened, to people who opted out, or about friends who hide visits" do
    quiet = telegram_user(telegram_chat_started_at: 2.days.ago, friend_updates: false)
    Friendship.connect!(quiet, @friend)
    @friend.update!(shares_visits: false)
    visit(@friend)

    bot = with_fake_bot { perform_enqueued_jobs { SendFriendDigestsJob.perform_now } }

    assert_empty bot.sent
    assert_nil @user.reload.last_friend_digest_at
  end

  test "repeat visits and old stamps aren't news" do
    travel(-2.days) { visit(@friend) }
    travel(-5.hours) { visit(@friend) }

    bot = with_fake_bot { perform_enqueued_jobs { SendFriendDigestsJob.perform_now } }
    assert_empty bot.sent
  end

  test "long lists are cut short" do
    shops = 7.times.map do |n|
      Shop.create!(shops(:bole).attributes.except("id", "slug", "created_at", "updated_at").merge("name" => "Café #{n}", "name_am" => "ካፌ #{n}", "slug" => "cafe-#{n}"))
    end
    shops.each { |shop| visit(@friend, shop: shop) }

    bot = with_fake_bot { SendFriendDigestJob.perform_now(@user) }
    assert_match "• and 2 more", bot.sent.sole[:text]
  end

  test "the round-up's button and the bot commands turn it off and on" do
    bot = with_fake_bot do
      Telegram::Update.new({ "callback_query" => { "id" => "1", "from" => { "id" => @user.telegram_user_id }, "data" => Telegram::Messages::FRIENDS_OFF } }).handle
    end
    assert_not @user.reload.friend_updates?
    assert_match "/friends_on", bot.answers.sole[:text]

    with_fake_bot do
      Telegram::Update.new({ "message" => { "chat" => { "id" => @user.telegram_user_id, "type" => "private" },
        "from" => { "id" => @user.telegram_user_id, "first_name" => "U" }, "text" => "/friends_on" } }).handle
    end
    assert @user.reload.friend_updates?
  end

  private
    def visit(user, shop: shops(:bole))
      CheckIn.record!(user: user, shop: shop, idempotency_key: SecureRandom.uuid,
        latitude: shop.latitude, longitude: shop.longitude, accuracy_meters: 10)
    end
end
