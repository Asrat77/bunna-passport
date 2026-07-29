ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"
require_relative "test_helpers/session_test_helper"
require_relative "test_helpers/api_test_helper"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    setup { Rails.cache.clear }

    def create_user(attributes = {})
      sequence = SecureRandom.hex(4)
      User.create!({
        email_address: "user-#{sequence}@example.com",
        handle: "user_#{sequence}",
        display_name: "Test User",
        password: "password",
        password_confirmation: "password"
      }.merge(attributes))
    end
  end
end
