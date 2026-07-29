class CreateBunnaPassportDomain < ActiveRecord::Migration[8.1]
  def change
    create_table :neighborhoods do |t|
      t.string :name, null: false
      t.string :name_am, null: false
      t.string :city, null: false, default: "Addis Ababa"
      t.decimal :latitude, precision: 10, scale: 7, null: false
      t.decimal :longitude, precision: 10, scale: 7, null: false
      t.json :boundary

      t.timestamps
    end
    add_index :neighborhoods, %i[ city name ], unique: true
    add_check_constraint :neighborhoods, "latitude BETWEEN -90 AND 90", name: "neighborhoods_latitude"
    add_check_constraint :neighborhoods, "longitude BETWEEN -180 AND 180", name: "neighborhoods_longitude"
    add_foreign_key :users, :neighborhoods, column: :home_neighborhood_id

    create_table :shops do |t|
      t.string :name, null: false
      t.string :name_am, null: false
      t.string :name_key, null: false
      t.string :name_am_key, null: false
      t.string :slug, null: false
      t.references :neighborhood, null: false, foreign_key: true
      t.text :landmark, null: false
      t.decimal :latitude, precision: 10, scale: 7, null: false
      t.decimal :longitude, precision: 10, scale: 7, null: false
      t.string :status, null: false, default: "pending"
      t.string :price_band
      t.json :amenities, null: false, default: {}
      t.references :submitted_by, null: false, foreign_key: { to_table: :users }
      t.references :merged_into, foreign_key: { to_table: :shops }
      t.integer :check_ins_count, null: false, default: 0
      t.integer :stamps_count, null: false, default: 0

      t.timestamps
    end
    add_index :shops, :slug, unique: true
    add_index :shops, :name_key
    add_index :shops, :name_am_key
    add_index :shops, %i[ latitude longitude ]
    add_index :shops, %i[ status updated_at ]
    add_check_constraint :shops,
      "status IN ('pending', 'live', 'hidden', 'closed', 'merged')",
      name: "shops_status"
    add_check_constraint :shops,
      "price_band IS NULL OR price_band IN ('budget', 'standard', 'premium', 'splurge')",
      name: "shops_price_band"
    add_check_constraint :shops, "latitude BETWEEN -90 AND 90", name: "shops_latitude"
    add_check_constraint :shops, "longitude BETWEEN -180 AND 180", name: "shops_longitude"
    add_check_constraint :shops,
      "check_ins_count >= 0 AND stamps_count >= 0",
      name: "shops_non_negative_counters"

    create_table :shop_hours do |t|
      t.references :shop, null: false, foreign_key: true, index: { unique: true }
      t.json :schedule, null: false, default: {}
      t.references :confirmed_by, null: false, foreign_key: { to_table: :users }
      t.datetime :confirmed_at, null: false

      t.timestamps
    end

    create_table :shop_submissions do |t|
      t.string :name, null: false
      t.string :name_am, null: false
      t.references :neighborhood, null: false, foreign_key: true
      t.text :landmark, null: false
      t.decimal :latitude, precision: 10, scale: 7, null: false
      t.decimal :longitude, precision: 10, scale: 7, null: false
      t.string :price_band
      t.json :amenities, null: false, default: {}
      t.json :hours, null: false, default: {}
      t.boolean :duplicate_override, null: false, default: false
      t.references :created_shop, foreign_key: { to_table: :shops }

      t.timestamps
    end

    create_table :shop_edits do |t|
      t.references :shop, null: false, foreign_key: true
      t.json :proposed_changes, null: false, default: {}
      t.json :previous_values, null: false, default: {}

      t.timestamps
    end

    create_table :shop_photo_submissions do |t|
      t.references :shop, null: false, foreign_key: true
      t.string :caption
      t.bigint :approved_photo_id

      t.timestamps
    end

    create_table :contributions do |t|
      t.references :user, null: false, foreign_key: true
      t.string :contributable_type, null: false
      t.bigint :contributable_id, null: false
      t.string :status, null: false, default: "pending"
      t.references :reviewed_by, foreign_key: { to_table: :users }
      t.datetime :reviewed_at
      t.text :rejection_reason

      t.timestamps
    end
    add_index :contributions,
      %i[ contributable_type contributable_id ],
      unique: true,
      name: "index_contributions_on_contributable"
    add_index :contributions, %i[ status created_at ]
    add_index :contributions, %i[ user_id created_at ]
    add_check_constraint :contributions,
      "status IN ('pending', 'approved', 'rejected', 'auto_approved')",
      name: "contributions_status"

    create_table :contribution_confirmations do |t|
      t.references :contribution, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end
    add_index :contribution_confirmations,
      %i[ contribution_id user_id ],
      unique: true,
      name: "index_confirmations_on_contribution_and_user"

    create_table :shop_photos do |t|
      t.references :shop, null: false, foreign_key: true
      t.references :contributor, null: false, foreign_key: { to_table: :users }
      t.string :caption

      t.timestamps
    end
    add_foreign_key :shop_photo_submissions, :shop_photos, column: :approved_photo_id

    create_table :check_ins do |t|
      t.references :user, null: false, foreign_key: true
      t.references :shop, null: false, foreign_key: true
      t.string :idempotency_key, null: false
      t.datetime :occurred_at, null: false
      t.decimal :latitude, precision: 10, scale: 7, null: false
      t.decimal :longitude, precision: 10, scale: 7, null: false
      t.integer :accuracy_meters, null: false
      t.integer :distance_meters, null: false
      t.boolean :mock_location, null: false, default: false
      t.string :status, null: false
      t.string :flag_reason
      t.string :drink
      t.integer :rating
      t.string :note
      t.datetime :verified_at
      t.datetime :counted_at

      t.timestamps
    end
    add_index :check_ins, %i[ user_id idempotency_key ], unique: true
    add_index :check_ins, %i[ user_id occurred_at ]
    add_index :check_ins, %i[ shop_id occurred_at ]
    add_index :check_ins, %i[ status occurred_at ]
    add_check_constraint :check_ins,
      "status IN ('verified', 'flagged', 'rejected')",
      name: "check_ins_status"
    add_check_constraint :check_ins, "accuracy_meters >= 0", name: "check_ins_accuracy"
    add_check_constraint :check_ins, "distance_meters >= 0", name: "check_ins_distance"
    add_check_constraint :check_ins, "rating IS NULL OR rating BETWEEN 1 AND 5", name: "check_ins_rating"
    add_check_constraint :check_ins, "latitude BETWEEN -90 AND 90", name: "check_ins_latitude"
    add_check_constraint :check_ins, "longitude BETWEEN -180 AND 180", name: "check_ins_longitude"

    create_table :stamps do |t|
      t.references :user, null: false, foreign_key: true
      t.references :shop, null: false, foreign_key: true
      t.references :first_check_in, null: false, foreign_key: { to_table: :check_ins }
      t.datetime :earned_at, null: false

      t.timestamps
    end
    add_index :stamps, %i[ user_id shop_id ], unique: true
    add_index :stamps, :earned_at

    create_table :badges do |t|
      t.string :slug, null: false
      t.string :name, null: false
      t.text :description, null: false
      t.string :artwork_key, null: false
      t.string :tier
      t.string :criterion, null: false
      t.integer :threshold, null: false

      t.timestamps
    end
    add_index :badges, :slug, unique: true
    add_check_constraint :badges, "threshold > 0", name: "badges_threshold"

    create_table :awards do |t|
      t.references :user, null: false, foreign_key: true
      t.references :badge, null: false, foreign_key: true
      t.datetime :earned_at, null: false

      t.timestamps
    end
    add_index :awards, %i[ user_id badge_id ], unique: true

    create_table :reports do |t|
      t.references :user, null: false, foreign_key: true
      t.string :reportable_type, null: false
      t.bigint :reportable_id, null: false
      t.string :reason, null: false
      t.text :note
      t.string :status, null: false, default: "pending"
      t.references :reviewed_by, foreign_key: { to_table: :users }
      t.datetime :reviewed_at

      t.timestamps
    end
    add_index :reports, %i[ reportable_type reportable_id ]
    add_index :reports, %i[ status created_at ]
    add_check_constraint :reports,
      "reason IN ('closed', 'duplicate', 'wrong_location', 'inaccurate_details', 'inappropriate', 'spam', 'other')",
      name: "reports_reason"
    add_check_constraint :reports,
      "status IN ('pending', 'upheld', 'dismissed')",
      name: "reports_status"

    create_table :leaderboard_entries do |t|
      t.references :user, null: false, foreign_key: true
      t.string :scope_key, null: false
      t.string :period, null: false
      t.string :metric, null: false
      t.datetime :period_started_at
      t.integer :value, null: false
      t.integer :rank, null: false
      t.datetime :refreshed_at, null: false

      t.timestamps
    end
    add_index :leaderboard_entries,
      %i[ scope_key period metric user_id ],
      unique: true,
      name: "index_leaderboard_entries_on_board_and_user"
    add_index :leaderboard_entries,
      %i[ scope_key period metric rank ],
      name: "index_leaderboard_entries_for_ranking"
    add_check_constraint :leaderboard_entries,
      "period IN ('week', 'month', 'all_time')",
      name: "leaderboard_entries_period"
    add_check_constraint :leaderboard_entries,
      "metric IN ('cups', 'shops')",
      name: "leaderboard_entries_metric"
    add_check_constraint :leaderboard_entries,
      "value >= 0 AND rank > 0",
      name: "leaderboard_entries_values"
  end
end
