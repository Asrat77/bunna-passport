require "test_helper"

# The Mini App on Appwrite calls the API from another origin.
class CorsTest < ActionDispatch::IntegrationTest
  APP_ORIGIN = "https://bunna-passport.appwrite.network"

  test "answers the Mini App's preflight" do
    options "/api/v1/passport", headers: {
      "Origin" => APP_ORIGIN,
      "Access-Control-Request-Method" => "GET",
      "Access-Control-Request-Headers" => "authorization"
    }

    assert_equal APP_ORIGIN, response.headers["Access-Control-Allow-Origin"]
    assert_includes response.headers["Access-Control-Allow-Methods"], "GET"
    assert_nil response.headers["Access-Control-Allow-Credentials"]
  end

  test "marks API responses as readable by the Mini App" do
    get "/api/v1/stats/city", headers: { "Origin" => APP_ORIGIN }

    assert_equal APP_ORIGIN, response.headers["Access-Control-Allow-Origin"]
  end

  test "ignores other origins" do
    get "/api/v1/stats/city", headers: { "Origin" => "https://evil.example" }

    assert_nil response.headers["Access-Control-Allow-Origin"]
  end
end
