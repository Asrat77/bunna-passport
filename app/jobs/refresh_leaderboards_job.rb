class RefreshLeaderboardsJob < ApplicationJob
  queue_as :default

  def perform
    LeaderboardEntry.refresh_all!
  end
end
