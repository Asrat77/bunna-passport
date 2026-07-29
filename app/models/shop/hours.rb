class Shop::Hours < ApplicationRecord
  self.table_name = "shop_hours"

  FRESH_FOR = 30.days
  DAYS = %w[ monday tuesday wednesday thursday friday saturday sunday ].freeze

  belongs_to :shop, touch: true
  belongs_to :confirmed_by, class_name: "User"

  validates :confirmed_at, presence: true
  validate :schedule_is_valid

  def freshness
    confirmed_at >= FRESH_FOR.ago ? "fresh" : "stale"
  end

  private
    def schedule_is_valid
      unless schedule.is_a?(Hash)
        errors.add(:schedule, "must be an object")
        return
      end

      unsupported = schedule.keys - DAYS
      if unsupported.any?
        errors.add(:schedule, "contains unsupported days: #{unsupported.join(", ")}")
        return
      end

      invalid_days = schedule.filter_map do |day, intervals|
        day unless intervals.is_a?(Array) && intervals.all? { |interval| valid_interval?(interval) }
      end
      errors.add(:schedule, "has invalid opening intervals for: #{invalid_days.join(", ")}") if invalid_days.any?
    end

    def valid_interval?(interval)
      return false unless interval.respond_to?(:to_h)

      values = interval.to_h.stringify_keys
      values.keys.sort == %w[ closes opens ] &&
        valid_clock_time?(values["opens"]) &&
        valid_clock_time?(values["closes"])
    end

    def valid_clock_time?(value)
      value.to_s.match?(/\A(?:[01]\d|2[0-3]):[0-5]\d\z/)
    end
end
