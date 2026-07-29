neighborhoods = [
  { name: "Bole", name_am: "ቦሌ", latitude: 8.9942, longitude: 38.7877 },
  { name: "Kazanchis", name_am: "ካዛንቺስ", latitude: 9.0175, longitude: 38.7656 },
  { name: "Piassa", name_am: "ፒያሳ", latitude: 9.0357, longitude: 38.7507 },
  { name: "Sarbet", name_am: "ሳር ቤት", latitude: 8.9835, longitude: 38.7358 },
  { name: "CMC", name_am: "ሲኤምሲ", latitude: 9.0247, longitude: 38.8398 },
  { name: "Megenagna", name_am: "መገናኛ", latitude: 9.0192, longitude: 38.8025 },
  { name: "Summit", name_am: "ሰሚት", latitude: 9.0121, longitude: 38.8618 },
  { name: "Gerji", name_am: "ገርጂ", latitude: 8.9984, longitude: 38.8209 },
  { name: "Old Airport", name_am: "ኦልድ ኤርፖርት", latitude: 8.9741, longitude: 38.7311 },
  { name: "4 Kilo", name_am: "አራት ኪሎ", latitude: 9.0331, longitude: 38.7612 },
  { name: "6 Kilo", name_am: "ስድስት ኪሎ", latitude: 9.0419, longitude: 38.7576 },
  { name: "Mexico", name_am: "ሜክሲኮ", latitude: 9.0103, longitude: 38.7440 },
  { name: "Lideta", name_am: "ልደታ", latitude: 9.0091, longitude: 38.7317 }
]

neighborhoods.each do |attributes|
  neighborhood = Neighborhood.find_or_initialize_by(city: "Addis Ababa", name: attributes[:name])
  neighborhood.update!(attributes)
end

badges = [
  {
    slug: "first-check-in", name: "First Cup", description: "Record your first verified coffee.",
    artwork_key: "first-cup", criterion: "verified_check_ins", threshold: 1
  },
  {
    slug: "five-shops", name: "Five Shops", description: "Collect stamps from five coffee shops.",
    artwork_key: "five-shops", criterion: "unique_shops", threshold: 5
  },
  {
    slug: "ten-shops", name: "Ten Shops", description: "Collect stamps from ten coffee shops.",
    artwork_key: "ten-shops", criterion: "unique_shops", threshold: 10
  },
  {
    slug: "ten-cups", name: "Ten Cups", description: "Record ten verified coffees.",
    artwork_key: "ten-cups", criterion: "verified_check_ins", threshold: 10
  },
  {
    slug: "fifty-cups", name: "Fifty Cups", description: "Record fifty verified coffees.",
    artwork_key: "fifty-cups", criterion: "verified_check_ins", threshold: 50
  },
  {
    slug: "first-contribution", name: "First Contribution", description: "Have a community contribution accepted.",
    artwork_key: "first-contribution", criterion: "approved_contributions", threshold: 1
  },
  {
    slug: "five-contributions", name: "Five Contributions", description: "Have five community contributions accepted.",
    artwork_key: "five-contributions", criterion: "approved_contributions", threshold: 5
  }
]

badges.each do |attributes|
  badge = Badge.find_or_initialize_by(slug: attributes[:slug])
  badge.update!(attributes)
end

if ENV["BUNNA_FOUNDER_EMAIL"].present?
  founder = User.find_or_initialize_by(email_address: ENV.fetch("BUNNA_FOUNDER_EMAIL"))
  founder.assign_attributes(
    handle: ENV.fetch("BUNNA_FOUNDER_HANDLE"),
    display_name: ENV.fetch("BUNNA_FOUNDER_DISPLAY_NAME", "Bunna Founder"),
    password: ENV.fetch("BUNNA_FOUNDER_PASSWORD"),
    password_confirmation: ENV.fetch("BUNNA_FOUNDER_PASSWORD"),
    trust_level: :moderator
  )
  founder.save!
end

if Rails.env.development? && ENV["BUNNA_SEED_SAMPLES"] == "1"
  contributor = User.find_or_create_by!(email_address: "sample@bunna.local") do |user|
    user.handle = "sample_drinker"
    user.display_name = "Sample Drinker"
    user.password = "development-password"
    user.trust_level = :curator
  end

  [
    [ "Sample Bole Coffee", "የቦሌ ናሙና ቡና", "Bole", 8.9942, 38.7877 ],
    [ "Sample Piassa Coffee", "የፒያሳ ናሙና ቡና", "Piassa", 9.0357, 38.7507 ]
  ].each do |name, name_am, neighborhood_name, latitude, longitude|
    Shop.find_or_create_by!(name: name) do |shop|
      shop.name_am = name_am
      shop.neighborhood = Neighborhood.find_by!(name: neighborhood_name)
      shop.landmark = "Development sample only"
      shop.latitude = latitude
      shop.longitude = longitude
      shop.status = :live
      shop.submitted_by = contributor
    end
  end
end
