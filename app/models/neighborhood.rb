class Neighborhood < ApplicationRecord
  DEFAULTS = [
    { name: "Bole", name_am: "ቦሌ", city: "Addis Ababa", latitude: 8.9942, longitude: 38.7877 },
    { name: "Kazanchis", name_am: "ካዛንቺስ", city: "Addis Ababa", latitude: 9.0175, longitude: 38.7656 },
    { name: "Piassa", name_am: "ፒያሳ", city: "Addis Ababa", latitude: 9.0357, longitude: 38.7507 },
    { name: "Sarbet", name_am: "ሳር ቤት", city: "Addis Ababa", latitude: 8.9835, longitude: 38.7358 },
    { name: "CMC", name_am: "ሲኤምሲ", city: "Addis Ababa", latitude: 9.0247, longitude: 38.8398 },
    { name: "Megenagna", name_am: "መገናኛ", city: "Addis Ababa", latitude: 9.0192, longitude: 38.8025 },
    { name: "Summit", name_am: "ሰሚት", city: "Addis Ababa", latitude: 9.0121, longitude: 38.8618 },
    { name: "Gerji", name_am: "ገርጂ", city: "Addis Ababa", latitude: 8.9984, longitude: 38.8209 },
    { name: "Old Airport", name_am: "ኦልድ ኤርፖርት", city: "Addis Ababa", latitude: 8.9741, longitude: 38.7311 },
    { name: "4 Kilo", name_am: "አራት ኪሎ", city: "Addis Ababa", latitude: 9.0331, longitude: 38.7612 },
    { name: "6 Kilo", name_am: "ስድስት ኪሎ", city: "Addis Ababa", latitude: 9.0419, longitude: 38.7576 },
    { name: "Mexico", name_am: "ሜክሲኮ", city: "Addis Ababa", latitude: 9.0103, longitude: 38.7440 },
    { name: "Lideta", name_am: "ልደታ", city: "Addis Ababa", latitude: 9.0091, longitude: 38.7317 }
  ].freeze

  has_many :shops, dependent: :restrict_with_exception
  has_many :residents, class_name: "User", foreign_key: :home_neighborhood_id, inverse_of: :home_neighborhood

  normalizes :name, :name_am, :city, with: ->(value) { value.strip }

  validates :name, :name_am, :city, presence: true
  validates :name, uniqueness: { scope: :city, case_sensitive: false }
  validates :latitude, numericality: { in: -90..90 }
  validates :longitude, numericality: { in: -180..180 }

  scope :alphabetically, -> { order(:name) }

  def self.install_defaults!
    transaction do
      DEFAULTS.each do |attributes|
        find_or_initialize_by(city: attributes.fetch(:city), name: attributes.fetch(:name)).update!(attributes)
      end
    end
  end

  def leaderboard_scope_key
    "neighborhood:#{id}"
  end
end
