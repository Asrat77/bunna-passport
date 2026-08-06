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

  desc "Import an ignored local shop catalog into development"
  task import_local_shops: :environment do
    abort "Local shop imports are available only in development" unless Rails.env.development?

    importer_email = ENV["BUNNA_LOCAL_IMPORTER_EMAIL"].presence
    abort "Missing BUNNA_LOCAL_IMPORTER_EMAIL" unless importer_email

    catalog = Shop::LocalCatalog.new(
      path: ENV.fetch("BUNNA_LOCAL_SHOPS_FILE", "storage/local_seed_data/shops.csv"),
      contributor: User.find_by!(email_address: importer_email.strip.downcase)
    )
    result = catalog.import!

    puts "Local catalog ready: #{result.shops_count} shops, #{result.photos_count} new photos"
  end

  desc "Report how real check-in attempts land against the verification thresholds"
  task checkin_report: :environment do
    attempts = CheckIn.order(:occurred_at)
    total = attempts.count
    if total.zero?
      puts "No check-in attempts recorded yet."
      next
    end

    def percentiles(values)
      return "n/a" if values.empty?
      sorted = values.compact.sort
      pick = ->(fraction) { sorted[[ (sorted.length * fraction).floor, sorted.length - 1 ].min] }
      "min #{sorted.first} / p50 #{pick.call(0.5)} / p90 #{pick.call(0.9)} / max #{sorted.last}"
    end

    puts "attempts: #{total}"
    attempts.group(:status).count.each { |status, count| puts "  #{status}: #{count}" }
    attempts.where.not(flag_reason: nil).group(:flag_reason).count.each do |reason, count|
      puts "  reason #{reason}: #{count}"
    end

    puts
    puts "accuracy metres (limit #{CheckIn::ACCURACY_LIMIT_METERS}): #{percentiles(attempts.pluck(:accuracy_meters))}"
    puts "distance metres (limit #{CheckIn::DISTANCE_LIMIT_METERS}): #{percentiles(attempts.pluck(:distance_meters))}"

    # What a different accuracy limit would have changed. Only attempts that
    # were also inside the radius could have succeeded, so a looser limit buys
    # nothing for someone who was simply somewhere else.
    puts
    puts "if the accuracy limit moved:"
    [ 100, 150, 200, 300 ].each do |limit|
      rescued = attempts.where(flag_reason: "weak_gps")
        .where(accuracy_meters: ..limit)
        .where(distance_meters: ..CheckIn::DISTANCE_LIMIT_METERS)
        .count
      puts "  #{limit}m: #{rescued} of the weak_gps rejections were also inside the radius"
    end

    genuinely_far = attempts.where(flag_reason: "weak_gps")
      .where("distance_meters > ?", CheckIn::DISTANCE_LIMIT_METERS).count
    puts
    puts "#{genuinely_far} weak_gps rejections were outside the radius anyway — loosening accuracy would not have helped them."
    puts "Treat anything under a few hundred attempts as anecdote, not evidence."
  end
end
