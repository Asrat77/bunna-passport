class AwardBadgesJob < ApplicationJob
  queue_as :default

  def perform(user)
    Badge.evaluate_for(user)
  end
end
