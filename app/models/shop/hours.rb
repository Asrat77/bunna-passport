class Shop::Hours < ApplicationRecord
  self.table_name = "shop_hours"

  FRESH_FOR = 30.days
  DAYS = %w[ monday tuesday wednesday thursday friday saturday sunday ].freeze

  belongs_to :shop, touch: true
  belongs_to :confirmed_by, class_name: "User"

  validates :confirmed_at, presence: true
  validate :schedule_has_supported_days

  def freshness
    confirmed_at >= FRESH_FOR.ago ? "fresh" : "stale"
  end

  private
    def schedule_has_supported_days
      unsupported = schedule.to_h.keys - DAYS
      errors.add(:schedule, "contains unsupported days: #{unsupported.join(", ")}") if unsupported.any?
    end
end
