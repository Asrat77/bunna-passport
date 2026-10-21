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
    { name: "Lideta", name_am: "ልደታ", city: "Addis Ababa", latitude: 9.0091, longitude: 38.7317 },
    # Added from OpenStreetMap place=suburb/neighbourhood nodes (ODbL, credited in the app).
    { name: "5 Kilo", name_am: "አምስት ኪሎ", city: "Addis Ababa", latitude: 9.0377, longitude: 38.7627 },
    { name: "Shiromeda", name_am: "ሽሮሜዳ", city: "Addis Ababa", latitude: 9.0605, longitude: 38.7614 },
    { name: "Shola", name_am: "ሾላ", city: "Addis Ababa", latitude: 9.0207, longitude: 38.7950 },
    { name: "Kebena", name_am: "ቀበና", city: "Addis Ababa", latitude: 9.0349, longitude: 38.7786 },
    { name: "Aware", name_am: "አዋሬ", city: "Addis Ababa", latitude: 9.0271, longitude: 38.7755 },
    { name: "Merkato", name_am: "መርካቶ", city: "Addis Ababa", latitude: 9.0313, longitude: 38.7376 },
    { name: "Autobus Tera", name_am: "አውቶብስ ተራ", city: "Addis Ababa", latitude: 9.0340, longitude: 38.7322 },
    { name: "Sebategna", name_am: "ሰባተኛ", city: "Addis Ababa", latitude: 9.0292, longitude: 38.7329 },
    { name: "Abnet", name_am: "አብነት", city: "Addis Ababa", latitude: 9.0203, longitude: 38.7333 },
    { name: "Addis Ketema", name_am: "አዲስ ከተማ", city: "Addis Ababa", latitude: 9.0237, longitude: 38.7337 },
    { name: "Mesalemiya", name_am: "መሳለሚያ", city: "Addis Ababa", latitude: 9.0338, longitude: 38.7250 },
    { name: "Teklehaimanot", name_am: "ተክለሃይማኖት", city: "Addis Ababa", latitude: 9.0285, longitude: 38.7434 },
    { name: "Sengatera", name_am: "ሰንጋ ተራ", city: "Addis Ababa", latitude: 9.0149, longitude: 38.7470 },
    { name: "Legehar", name_am: "ለገሐር", city: "Addis Ababa", latitude: 9.0116, longitude: 38.7531 },
    { name: "Ambassador", name_am: "አምባሳደር", city: "Addis Ababa", latitude: 9.0183, longitude: 38.7540 },
    { name: "Meshuwalekiya", name_am: "መሿለኪያ", city: "Addis Ababa", latitude: 9.0071, longitude: 38.7589 },
    { name: "Olympia", name_am: "ኦሎምፒያ", city: "Addis Ababa", latitude: 9.0039, longitude: 38.7681 },
    { name: "Beklo Bet", name_am: "በቅሎ ቤት", city: "Addis Ababa", latitude: 8.9983, longitude: 38.7584 },
    { name: "Bulgaria", name_am: "ቡልጋሪያ", city: "Addis Ababa", latitude: 8.9945, longitude: 38.7479 },
    { name: "Meskel Flower", name_am: "መስቀል ፍላወር", city: "Addis Ababa", latitude: 8.9880, longitude: 38.7643 },
    { name: "Lancha", name_am: "ላንቻ", city: "Addis Ababa", latitude: 8.9896, longitude: 38.7598 },
    { name: "Gotera", name_am: "ጎተራ", city: "Addis Ababa", latitude: 8.9821, longitude: 38.7585 },
    { name: "Kera", name_am: "ቄራ", city: "Addis Ababa", latitude: 8.9848, longitude: 38.7502 },
    { name: "Urael", name_am: "ኡራኤል", city: "Addis Ababa", latitude: 9.0109, longitude: 38.7750 },
    { name: "Enderase", name_am: "እንደራሴ", city: "Addis Ababa", latitude: 9.0175, longitude: 38.7764 },
    { name: "Hayahulet", name_am: "ሃያ ሁለት", city: "Addis Ababa", latitude: 9.0162, longitude: 38.7893 },
    { name: "Wollo Sefer", name_am: "ወሎ ሰፈር", city: "Addis Ababa", latitude: 8.9942, longitude: 38.7742 },
    { name: "Rwanda", name_am: "ሩዋንዳ", city: "Addis Ababa", latitude: 8.9918, longitude: 38.7793 },
    { name: "Bole Michael", name_am: "ቦሌ ሚካኤል", city: "Addis Ababa", latitude: 8.9808, longitude: 38.7748 },
    { name: "Bole Bulbula", name_am: "ቦሌ ቡልቡላ", city: "Addis Ababa", latitude: 8.9483, longitude: 38.7932 },
    { name: "Bole Arabsa", name_am: "ቦሌ አራብሳ", city: "Addis Ababa", latitude: 8.9777, longitude: 38.8877 },
    { name: "Gurd Shola", name_am: "ጉርድ ሾላ", city: "Addis Ababa", latitude: 9.0211, longitude: 38.8120 },
    { name: "Selam Sefer", name_am: "ሰላም ሰፈር", city: "Addis Ababa", latitude: 9.0131, longitude: 38.8317 },
    { name: "Jackros", name_am: "ጃክሮስ", city: "Addis Ababa", latitude: 9.0041, longitude: 38.8075 },
    { name: "Goro", name_am: "ጎሮ", city: "Addis Ababa", latitude: 8.9970, longitude: 38.8321 },
    { name: "Lamberet", name_am: "ላምበረት", city: "Addis Ababa", latitude: 9.0267, longitude: 38.8269 },
    { name: "Ayat", name_am: "አያት", city: "Addis Ababa", latitude: 9.0209, longitude: 38.8781 },
    { name: "Kara", name_am: "ካራ", city: "Addis Ababa", latitude: 9.0419, longitude: 38.8610 },
    { name: "Kotebe", name_am: "ኮተቤ", city: "Addis Ababa", latitude: 9.0371, longitude: 38.8399 },
    { name: "Tor Hailoch", name_am: "ጦር ሃይሎች", city: "Addis Ababa", latitude: 9.0115, longitude: 38.7241 },
    { name: "Bisrate Gabriel", name_am: "ብስራተ ገብርኤል", city: "Addis Ababa", latitude: 8.9919, longitude: 38.7264 },
    { name: "Kolfe", name_am: "ኮልፌ", city: "Addis Ababa", latitude: 9.0164, longitude: 38.7172 },
    { name: "Asko", name_am: "አስኮ", city: "Addis Ababa", latitude: 9.0659, longitude: 38.6935 },
    { name: "Ayer Tena", name_am: "አየር ጤና", city: "Addis Ababa", latitude: 8.9836, longitude: 38.6971 },
    { name: "Lebu", name_am: "ለቡ", city: "Addis Ababa", latitude: 8.9611, longitude: 38.7254 },
    { name: "Jemo", name_am: "ጀሞ", city: "Addis Ababa", latitude: 8.9600, longitude: 38.7115 },
    { name: "Lafto", name_am: "ላፍቶ", city: "Addis Ababa", latitude: 8.9471, longitude: 38.7443 },
    { name: "Hana Mariam", name_am: "ሐና ማርያም", city: "Addis Ababa", latitude: 8.9346, longitude: 38.7444 },
    { name: "Saris", name_am: "ሳሪስ", city: "Addis Ababa", latitude: 8.9532, longitude: 38.7636 },
    { name: "Kality", name_am: "ቃሊቲ", city: "Addis Ababa", latitude: 8.9380, longitude: 38.7631 },
    # Edge of the city, placed at the median of Google places that had no neighborhood within 2 km.
    { name: "Bethel", name_am: "ቤቴል", city: "Addis Ababa", latitude: 9.0042, longitude: 38.6871 },
    { name: "Addisu Gebeya", name_am: "አዲሱ ገበያ", city: "Addis Ababa", latitude: 9.0589, longitude: 38.7346 },
    { name: "Lege Tafo", name_am: "ለገ ጣፎ", city: "Addis Ababa", latitude: 9.0653, longitude: 38.8776 },
    { name: "Ayat 49", name_am: "አያት 49", city: "Addis Ababa", latitude: 9.0094, longitude: 38.8948 },
    { name: "Burayu", name_am: "ቡራዩ", city: "Addis Ababa", latitude: 9.0341, longitude: 38.6694 },
    { name: "Summit Condominium", name_am: "ሰሚት ኮንዶሚኒየም", city: "Addis Ababa", latitude: 8.9907, longitude: 38.8552 },
    { name: "Koye Feche", name_am: "ቆይ ፈጬ", city: "Addis Ababa", latitude: 8.9057, longitude: 38.8238 }
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
