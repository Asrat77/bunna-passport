require "test_helper"

class Api::V1::TelegramSessionsTest < ActionDispatch::IntegrationTest
  BOT_TOKEN = "123456:test-bot-token"

  setup do
    @previous_token = ENV["TELEGRAM_BOT_TOKEN"]
    ENV["TELEGRAM_BOT_TOKEN"] = BOT_TOKEN
  end

  teardown { ENV["TELEGRAM_BOT_TOKEN"] = @previous_token }

  test "signed initData signs in, creating the account on first launch" do
    init_data = signed_init_data(user: { id: 5550001, first_name: "Meklit", username: "meklit" })

    assert_difference -> { User.count }, 1 do
      post api_v1_telegram_sessions_path, params: { init_data: init_data }, as: :json
    end
    assert_response :created
    assert_equal "meklit", response_json.dig("data", "user", "handle")

    get api_v1_profile_path, headers: { "Authorization" => "Bearer #{response_json.dig("data", "token")}" }, as: :json
    assert_response :success

    assert_no_difference -> { User.count } do
      post api_v1_telegram_sessions_path, params: { init_data: init_data }, as: :json
    end
    assert_response :created
  end

  test "a tampered payload is refused" do
    init_data = signed_init_data(user: { id: 5550002, first_name: "Dawit" }).sub("Dawit", "Admin")

    post api_v1_telegram_sessions_path, params: { init_data: init_data }, as: :json

    assert_response :unauthorized
    assert_equal "invalid_init_data", response_json["code"]
  end

  test "a payload signed by another bot is refused" do
    init_data = signed_init_data(user: { id: 5550003, first_name: "Hana" }, bot_token: "999:other")

    post api_v1_telegram_sessions_path, params: { init_data: init_data }, as: :json

    assert_response :unauthorized
  end

  test "an old payload is refused" do
    init_data = signed_init_data(user: { id: 5550004, first_name: "Sara" }, auth_date: 2.days.ago)

    post api_v1_telegram_sessions_path, params: { init_data: init_data }, as: :json

    assert_response :unauthorized
    assert_equal "initData has expired", response_json["message"]
  end

  private
    def signed_init_data(user:, auth_date: Time.current, bot_token: BOT_TOKEN)
      fields = { "auth_date" => auth_date.to_i.to_s, "query_id" => "AAH", "user" => user.to_json }
      check_string = fields.sort.map { |key, value| "#{key}=#{value}" }.join("\n")
      secret = OpenSSL::HMAC.digest("SHA256", "WebAppData", bot_token)
      URI.encode_www_form(fields.merge("hash" => OpenSSL::HMAC.hexdigest("SHA256", secret, check_string)))
    end
end
