class RefreshLeaderboardsJob < ApplicationJob
  queue_as :default

  def perform(*periods)
    LeaderboardEntry.refresh!(periods: periods.presence || LeaderboardEntry.periods.keys)
  end
end
