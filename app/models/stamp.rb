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

  def level
    LEVELS.reduce("bronze") { |earned, (name, required)| check_ins_count >= required ? name : earned }
  end

  # Visits still needed for the next level, or nil at the top.
  def visits_to_next_level
    next_threshold = LEVELS.values.find { |required| check_ins_count < required }
    next_threshold && next_threshold - check_ins_count
  end
end
