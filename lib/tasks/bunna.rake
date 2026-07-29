namespace :bunna do
  desc "Install required neighborhoods and badge definitions"
  task bootstrap_reference_data: :environment do
    ActiveRecord::Base.transaction do
      Neighborhood.install_defaults!
      Badge.install_defaults!
    end

    puts "Reference data ready: #{Neighborhood::DEFAULTS.size} neighborhoods, #{Badge::DEFAULTS.size} badges"
  end

  desc "Create or promote the environment-configured founder to moderator"
  task bootstrap_founder: :environment do
    required = %w[
      BUNNA_FOUNDER_EMAIL
      BUNNA_FOUNDER_HANDLE
      BUNNA_FOUNDER_PASSWORD
    ]
    missing = required.select { |key| ENV[key].blank? }
    abort "Missing #{missing.to_sentence}" if missing.any?

    user = User.find_or_initialize_by(email_address: ENV.fetch("BUNNA_FOUNDER_EMAIL"))
    user.assign_attributes(
      handle: ENV.fetch("BUNNA_FOUNDER_HANDLE"),
      display_name: ENV.fetch("BUNNA_FOUNDER_DISPLAY_NAME", "Bunna Founder"),
      password: ENV.fetch("BUNNA_FOUNDER_PASSWORD"),
      password_confirmation: ENV.fetch("BUNNA_FOUNDER_PASSWORD"),
      trust_level: :moderator
    )
    user.save!
    puts "Moderator ready: @#{user.handle}"
  end
end
