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

  def with_env(values)
    previous = values.to_h { |key, _value| [ key, ENV[key] ] }
    values.each { |key, value| ENV[key] = value }
    yield
  ensure
    previous.each { |key, value| ENV[key] = value }
  end
end

ActiveSupport.on_load(:action_dispatch_integration_test) do
  include ApiTestHelper
end
