module SessionTestHelper
  def sign_in_as(user)
    Current.session, raw_token = Session.start_for(
      user,
      user_agent: "Rails test",
      ip_address: "127.0.0.1"
    )

    ActionDispatch::TestRequest.create.cookie_jar.tap do |cookie_jar|
      cookie_jar.signed[:session_token] = raw_token
      cookies["session_token"] = cookie_jar[:session_token]
    end
  end

  def sign_out
    Current.session&.destroy!
    cookies.delete("session_token")
  end
end

ActiveSupport.on_load(:action_dispatch_integration_test) do
  include SessionTestHelper
end
