class Neighborhood < ApplicationRecord
  has_many :shops, dependent: :restrict_with_exception
  has_many :residents, class_name: "User", foreign_key: :home_neighborhood_id, inverse_of: :home_neighborhood

  normalizes :name, :name_am, :city, with: ->(value) { value.strip }

  validates :name, :name_am, :city, presence: true
  validates :name, uniqueness: { scope: :city, case_sensitive: false }
  validates :latitude, numericality: { in: -90..90 }
  validates :longitude, numericality: { in: -180..180 }

  scope :alphabetically, -> { order(:name) }

  def leaderboard_scope_key
    "neighborhood:#{id}"
  end
end
