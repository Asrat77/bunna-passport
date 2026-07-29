class LeaderboardEntry < ApplicationRecord
  CITY_SCOPE = "city:addis-ababa"

  belongs_to :user

  enum :period, {
    week: "week",
    month: "month",
    all_time: "all_time"
  }, validate: true

  enum :metric, {
    cups: "cups",
    shops: "shops"
  }, validate: true

  scope :ranked, -> { order(:rank) }

  def self.refresh_all!
    periods.each_key do |period|
      refresh_board!(scope_key: CITY_SCOPE, period: period)
      Neighborhood.find_each do |neighborhood|
        refresh_board!(scope_key: neighborhood.leaderboard_scope_key, period: period, neighborhood: neighborhood)
      end
    end
  end

  def self.refresh_board!(scope_key:, period:, neighborhood: nil)
    %w[ cups shops ].each do |metric|
      values = values_for(period: period, metric: metric, neighborhood: neighborhood)
      transaction do
        where(scope_key: scope_key, period: period, metric: metric).delete_all
        values.each_with_index do |(user_id, value), index|
          create!(
            user_id: user_id,
            scope_key: scope_key,
            period: period,
            metric: metric,
            period_started_at: period_start(period),
            value: value,
            rank: index + 1,
            refreshed_at: Time.current
          )
        end
      end
    end
  end

  def self.values_for(period:, metric:, neighborhood:)
    start = period_start(period)
    source = metric.to_s == "cups" ? CheckIn.verified.joins(:shop) : Stamp.joins(:shop, :first_check_in).merge(CheckIn.verified)
    source = source.where(shops: { neighborhood_id: neighborhood.id }) if neighborhood
    source = source.where(metric.to_s == "cups" ? { check_ins: { occurred_at: start.. } } : { stamps: { earned_at: start.. } }) if start
    source.group(:user_id).count.sort_by { |user_id, value| [ -value, user_id ] }.first(100)
  end

  def self.period_start(period)
    case period.to_s
    when "week" then Time.current.beginning_of_week
    when "month" then Time.current.beginning_of_month
    end
  end
end
