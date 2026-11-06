require "test_helper"

# The Mini App reports the language it shows, and the bot follows it.
class Api::V1::ProfileLanguageTest < ActionDispatch::IntegrationTest
  test "the app can set the bot's language, and only to one it speaks" do
    user = create_user

    patch api_v1_profile_path, params: { profile: { language: "am" } }, headers: bearer_headers(user), as: :json
    assert_response :success
    assert_equal "am", response_json.dig("data", "language")
    assert_equal :am, user.reload.bot_locale

    patch api_v1_profile_path, params: { profile: { language: "fr" } }, headers: bearer_headers(user), as: :json
    assert_response :unprocessable_content
    assert_equal "am", user.reload.language
  end
end
