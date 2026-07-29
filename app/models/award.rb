class Award < ApplicationRecord
  belongs_to :user
  belongs_to :badge

  validates :earned_at, presence: true
end
