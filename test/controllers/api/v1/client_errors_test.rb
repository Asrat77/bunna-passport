require "test_helper"

class Api::V1::ClientErrorsTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  test "a Mini App crash becomes one alert naming the person and screen" do
    user = create_user

    with_fake_bot(env: { "BUNNA_ALERT_CHAT_IDS" => "111" }) do |bot|
      perform_enqueued_jobs do
        2.times do
          post api_v1_client_errors_path,
            params: { client_error: { message: "x is undefined", stack: "at Shop (Shop.tsx:12)", screen: "shop" } },
            headers: bearer_headers(user),
            as: :json
          assert_response :no_content
        end
      end

      text = bot.sent.sole[:text]
      assert_match "Mini App: x is undefined", text
      assert_match "Screen: shop", text
      assert_match "@#{user.handle}", text
      assert_match "Shop.tsx:12", text
    end
  end

  test "works signed out and refuses an empty message" do
    with_fake_bot(env: { "BUNNA_ALERT_CHAT_IDS" => "111" }) do
      post api_v1_client_errors_path, params: { client_error: { message: "boom" } }, as: :json
      assert_response :no_content

      post api_v1_client_errors_path, params: { client_error: { message: " " } }, as: :json
      assert_response :bad_request
    end
  end
end
