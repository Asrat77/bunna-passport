require "test_helper"

class MiniAppsControllerTest < ActionDispatch::IntegrationTest
  setup { @built_page = MiniAppsController.page }
  teardown { MiniAppsController.page = @built_page }

  test "serves the built page without letting it be cached" do
    Dir.mktmpdir do |dir|
      MiniAppsController.page = Pathname(dir).join("index.html")
      MiniAppsController.page.write("<!doctype html><title>Bunna Passport</title>")

      get mini_app_path

      assert_response :success
      assert_equal "no-cache", response.headers["Cache-Control"]
      assert_nil response.headers["X-Frame-Options"], "Telegram's desktop and web clients frame the app"
      assert_includes response.body, "Bunna Passport"
    end
  end

  test "answers not found before the page is built" do
    MiniAppsController.page = Rails.root.join("tmp", "no-mini-app", "index.html")

    get mini_app_path

    assert_response :not_found
  end
end
