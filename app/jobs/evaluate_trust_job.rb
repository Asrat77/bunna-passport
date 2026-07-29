class EvaluateTrustJob < ApplicationJob
  queue_as :default

  def perform(user)
    user.evaluate_trust!
  end
end
