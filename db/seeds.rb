abort "db:seed is available only in development and test" unless Rails.env.development? || Rails.env.test?

ActiveRecord::Base.transaction do
  Neighborhood.install_defaults!
  Badge.install_defaults!
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
