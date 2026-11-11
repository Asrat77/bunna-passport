class RefreshNeighborhoodLeaderboardsJob < ApplicationJob
  queue_as :default

  def perform(neighborhood)
    LeaderboardEntry.refresh_around!(neighborhood)
  end
end
