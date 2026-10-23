class Stamp < ApplicationRecord
  # A stamp is permanent from the first visit; the level is how well you know
  # the place. Thresholds are counted verified visits to that one shop, so the
  # first check-in that earns the stamp also earns bronze.
  LEVELS = {
    "bronze" => 1,
    "silver" => 5,
    "gold" => 15,
    "diamond" => 30
  }.freeze

  belongs_to :user
  belongs_to :shop
  belongs_to :first_check_in, class_name: "CheckIn"

  scope :reverse_chronologically, -> { order(earned_at: :desc, id: :desc) }

  def self.level_for(check_ins_count)
    LEVELS.reduce("bronze") { |earned, (name, required)| check_ins_count >= required ? name : earned }
  end

  # Visits still needed for the next level, or nil at the top.
  def self.visits_to_next_level(check_ins_count)
    next_threshold = LEVELS.values.find { |required| check_ins_count < required }
    next_threshold && next_threshold - check_ins_count
  end

  # The level a visit count first reaches, or nil when that count changes
  # nothing. The first counted visit reaches bronze, which is the new stamp.
  def self.level_reached_at(check_ins_count)
    LEVELS.key(check_ins_count)
  end

  def level
    self.class.level_for(check_ins_count)
  end

  def visits_to_next_level
    self.class.visits_to_next_level(check_ins_count)
  end
end
