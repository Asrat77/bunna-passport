module ApiTestHelper
  def bearer_headers(user)
    _session, token = Session.start_for(
      user,
      user_agent: "Rails API test",
      ip_address: "127.0.0.1"
    )
    { "Authorization" => "Bearer #{token}" }
  end

  def response_json
    JSON.parse(response.body)
  end
end

ActiveSupport.on_load(:action_dispatch_integration_test) do
  include ApiTestHelper
end
