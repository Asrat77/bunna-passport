class Api::V1::LeaderboardsController < Api::V1::BaseController
  allow_unauthenticated_access

  def index
    period = params.fetch(:period, "week")
    metric = params.fetch(:metric, "cups")
    raise ActionController::BadRequest, "Unsupported leaderboard period" unless period.in?(LeaderboardEntry.periods)
    raise ActionController::BadRequest, "Unsupported leaderboard metric" unless metric.in?(LeaderboardEntry.metrics)

    scope = params.fetch(:scope, "city")
    scope_key = case scope
    when "city", "friends" then LeaderboardEntry::CITY_SCOPE
    when "neighborhood" then Neighborhood.find(params.require(:neighborhood_id)).leaderboard_scope_key
    else raise ActionController::BadRequest, "Unsupported leaderboard scope"
    end
    entries = LeaderboardEntry.where(
      scope_key: scope_key,
      period: period,
      metric: metric
    ).ranked.includes(:user)

    if scope == "friends"
      authenticate
      return if performed?

      entries = rerank(entries.where(user_id: Current.user.friend_ids_with_self).to_a)
    else
      entries = entries.limit(100).to_a
    end
    cup_today_ids = User.ids_with_cup_today(entries.map(&:user_id))

    render_data(
      entries.map do |entry|
        {
          rank: entry.rank,
          value: entry.value,
          user: {
            id: entry.user_id,
            handle: entry.user.handle,
            display_name: entry.user.display_name,
            avatar_seed: entry.user.avatar_seed,
            had_cup_today: entry.user.public_cup_status(cup_today_ids)
          }
        }
      end,
      meta: { refreshed_at: entries.map(&:refreshed_at).max&.iso8601 }
    )
  end

  private
    # A friends board is the city board with everyone else left out, ranked
    # again from 1. The city board keeps its top 100, so it is too.
    def rerank(entries)
      entries.each.with_index(1) { |entry, rank| entry.rank = rank }
    end
end
