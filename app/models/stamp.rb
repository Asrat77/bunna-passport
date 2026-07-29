class Stamp < ApplicationRecord
  belongs_to :user
  belongs_to :shop
  belongs_to :first_check_in, class_name: "CheckIn"

  scope :reverse_chronologically, -> { order(earned_at: :desc, id: :desc) }
end
