require "test_helper"

class Api::V1::AuthenticationTest < ActionDispatch::IntegrationTest
  test "signup returns a one-time bearer token and stores only its digest" do
    assert_difference -> { User.count }, 1 do
      assert_difference -> { Session.count }, 1 do
        post api_v1_users_path, params: {
          user: {
            email_address: "new@example.com",
            handle: "new_drinker",
            display_name: "New Drinker",
            password: "long-enough-password",
            password_confirmation: "long-enough-password"
          }
        }, as: :json
      end
    end

    assert_response :created
    token = response_json.dig("data", "token")
    assert token.present?
    assert_not_equal token, Session.last.token_digest
    assert_equal Session.digest(token), Session.last.token_digest
  end

  test "sign in and revoke current bearer session" do
    post api_v1_sessions_path, params: {
      session: { email_address: users(:one).email_address, password: "password" }
    }, as: :json

    assert_response :created
    token = response_json.dig("data", "token")
    headers = { "Authorization" => "Bearer #{token}" }

    get api_v1_profile_path, headers: headers, as: :json
    assert_response :success
    assert_equal users(:one).id, response_json.dig("data", "id")

    delete api_v1_current_session_path, headers: headers, as: :json
    assert_response :no_content

    get api_v1_profile_path, headers: headers, as: :json
    assert_response :unauthorized
    assert_equal "authentication_required", response_json["code"]
  end

  test "web cookies and API bearer sessions stay isolated" do
    sign_in_as(users(:two))

    get api_v1_profile_path, as: :json
    assert_response :unauthorized

    sign_out
    get root_path, headers: bearer_headers(users(:two))
    assert_redirected_to new_session_path
  end

  test "invalid credentials use a structured error" do
    post api_v1_sessions_path, params: {
      session: { email_address: users(:one).email_address, password: "wrong" }
    }, as: :json

    assert_response :unauthorized
    assert_equal(
      {
        "code" => "invalid_credentials",
        "message" => "Email address or password is incorrect"
      },
      response_json
    )
  end

  test "sign-in rate limits return a structured error" do
    11.times do
      post api_v1_sessions_path, params: {
        session: { email_address: users(:one).email_address, password: "wrong" }
      }, as: :json
    end

    assert_response :too_many_requests
    assert_equal "rate_limit_exceeded", response_json["code"]
  end

  test "password reset does not disclose whether an account exists" do
    assert_enqueued_jobs 1 do
      post api_v1_password_resets_path, params: { email_address: users(:one).email_address }, as: :json
    end
    assert_response :accepted

    assert_no_enqueued_jobs do
      post api_v1_password_resets_path, params: { email_address: "missing@example.com" }, as: :json
    end
    assert_response :accepted
  end

  test "password reset replaces the password and revokes every session" do
    user = users(:one)
    Session.start_for(user, user_agent: "old device", ip_address: "127.0.0.1")
    token = user.generate_token_for(:password_reset)

    patch api_v1_password_reset_path, params: {
      password_reset: {
        token: token,
        password: "replacement-password",
        password_confirmation: "replacement-password"
      }
    }, as: :json

    assert_response :no_content
    assert User.authenticate_by(email_address: user.email_address, password: "replacement-password")
    assert_empty user.sessions.reload
  end
end
