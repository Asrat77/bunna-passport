# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_07_29_180700) do
  create_table "active_storage_attachments", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.bigint "record_id", null: false
    t.string "record_type", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.string "content_type"
    t.datetime "created_at", null: false
    t.string "filename", null: false
    t.string "key", null: false
    t.text "metadata"
    t.string "service_name", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "awards", force: :cascade do |t|
    t.integer "badge_id", null: false
    t.datetime "created_at", null: false
    t.datetime "earned_at", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["badge_id"], name: "index_awards_on_badge_id"
    t.index ["user_id", "badge_id"], name: "index_awards_on_user_id_and_badge_id", unique: true
    t.index ["user_id"], name: "index_awards_on_user_id"
  end

  create_table "badges", force: :cascade do |t|
    t.string "artwork_key", null: false
    t.datetime "created_at", null: false
    t.string "criterion", null: false
    t.text "description", null: false
    t.string "name", null: false
    t.string "slug", null: false
    t.integer "threshold", null: false
    t.string "tier"
    t.datetime "updated_at", null: false
    t.index ["slug"], name: "index_badges_on_slug", unique: true
    t.check_constraint "threshold > 0", name: "badges_threshold"
  end

  create_table "check_ins", force: :cascade do |t|
    t.integer "accuracy_meters", null: false
    t.datetime "counted_at"
    t.datetime "created_at", null: false
    t.integer "distance_meters", null: false
    t.string "drink"
    t.string "flag_reason"
    t.string "idempotency_key", null: false
    t.decimal "latitude", precision: 10, scale: 7, null: false
    t.decimal "longitude", precision: 10, scale: 7, null: false
    t.boolean "mock_location", default: false, null: false
    t.string "note"
    t.datetime "occurred_at", null: false
    t.integer "rating"
    t.integer "shop_id", null: false
    t.string "status", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.datetime "verified_at"
    t.index ["shop_id", "occurred_at"], name: "index_check_ins_on_shop_id_and_occurred_at"
    t.index ["shop_id"], name: "index_check_ins_on_shop_id"
    t.index ["status", "occurred_at"], name: "index_check_ins_on_status_and_occurred_at"
    t.index ["user_id", "idempotency_key"], name: "index_check_ins_on_user_id_and_idempotency_key", unique: true
    t.index ["user_id", "occurred_at"], name: "index_check_ins_on_user_id_and_occurred_at"
    t.index ["user_id"], name: "index_check_ins_on_user_id"
    t.check_constraint "accuracy_meters >= 0", name: "check_ins_accuracy"
    t.check_constraint "distance_meters >= 0", name: "check_ins_distance"
    t.check_constraint "latitude BETWEEN -90 AND 90", name: "check_ins_latitude"
    t.check_constraint "longitude BETWEEN -180 AND 180", name: "check_ins_longitude"
    t.check_constraint "rating IS NULL OR rating BETWEEN 1 AND 5", name: "check_ins_rating"
    t.check_constraint "status IN ('verified', 'flagged', 'rejected')", name: "check_ins_status"
  end

  create_table "contribution_confirmations", force: :cascade do |t|
    t.integer "contribution_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["contribution_id", "user_id"], name: "index_confirmations_on_contribution_and_user", unique: true
    t.index ["contribution_id"], name: "index_contribution_confirmations_on_contribution_id"
    t.index ["user_id"], name: "index_contribution_confirmations_on_user_id"
  end

  create_table "contributions", force: :cascade do |t|
    t.bigint "contributable_id", null: false
    t.string "contributable_type", null: false
    t.datetime "created_at", null: false
    t.text "rejection_reason"
    t.datetime "reviewed_at"
    t.integer "reviewed_by_id"
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["contributable_type", "contributable_id"], name: "index_contributions_on_contributable", unique: true
    t.index ["reviewed_by_id"], name: "index_contributions_on_reviewed_by_id"
    t.index ["status", "created_at"], name: "index_contributions_on_status_and_created_at"
    t.index ["user_id", "created_at"], name: "index_contributions_on_user_id_and_created_at"
    t.index ["user_id"], name: "index_contributions_on_user_id"
    t.check_constraint "status IN ('pending', 'approved', 'rejected', 'auto_approved')", name: "contributions_status"
  end

  create_table "leaderboard_entries", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "metric", null: false
    t.string "period", null: false
    t.datetime "period_started_at"
    t.integer "rank", null: false
    t.datetime "refreshed_at", null: false
    t.string "scope_key", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.integer "value", null: false
    t.index ["scope_key", "period", "metric", "rank"], name: "index_leaderboard_entries_for_ranking"
    t.index ["scope_key", "period", "metric", "user_id"], name: "index_leaderboard_entries_on_board_and_user", unique: true
    t.index ["user_id"], name: "index_leaderboard_entries_on_user_id"
    t.check_constraint "metric IN ('cups', 'shops')", name: "leaderboard_entries_metric"
    t.check_constraint "period IN ('week', 'month', 'all_time')", name: "leaderboard_entries_period"
    t.check_constraint "value >= 0 AND rank > 0", name: "leaderboard_entries_values"
  end

  create_table "neighborhoods", force: :cascade do |t|
    t.json "boundary"
    t.string "city", default: "Addis Ababa", null: false
    t.datetime "created_at", null: false
    t.decimal "latitude", precision: 10, scale: 7, null: false
    t.decimal "longitude", precision: 10, scale: 7, null: false
    t.string "name", null: false
    t.string "name_am", null: false
    t.datetime "updated_at", null: false
    t.index ["city", "name"], name: "index_neighborhoods_on_city_and_name", unique: true
    t.check_constraint "latitude BETWEEN -90 AND 90", name: "neighborhoods_latitude"
    t.check_constraint "longitude BETWEEN -180 AND 180", name: "neighborhoods_longitude"
  end

  create_table "reports", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "note"
    t.string "reason", null: false
    t.bigint "reportable_id", null: false
    t.string "reportable_type", null: false
    t.datetime "reviewed_at"
    t.integer "reviewed_by_id"
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["reportable_type", "reportable_id"], name: "index_reports_on_reportable_type_and_reportable_id"
    t.index ["reviewed_by_id"], name: "index_reports_on_reviewed_by_id"
    t.index ["status", "created_at"], name: "index_reports_on_status_and_created_at"
    t.index ["user_id"], name: "index_reports_on_user_id"
    t.check_constraint "reason IN ('closed', 'duplicate', 'wrong_location', 'inaccurate_details', 'inappropriate', 'spam', 'other')", name: "reports_reason"
    t.check_constraint "status IN ('pending', 'upheld', 'dismissed')", name: "reports_status"
  end

  create_table "sessions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.string "ip_address"
    t.datetime "last_seen_at", null: false
    t.string "token_digest", null: false
    t.datetime "updated_at", null: false
    t.string "user_agent"
    t.integer "user_id", null: false
    t.index ["expires_at"], name: "index_sessions_on_expires_at"
    t.index ["token_digest"], name: "index_sessions_on_token_digest", unique: true
    t.index ["user_id"], name: "index_sessions_on_user_id"
  end

  create_table "shop_edits", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.json "previous_values", default: {}, null: false
    t.json "proposed_changes", default: {}, null: false
    t.integer "shop_id", null: false
    t.datetime "updated_at", null: false
    t.index ["shop_id"], name: "index_shop_edits_on_shop_id"
  end

  create_table "shop_hours", force: :cascade do |t|
    t.datetime "confirmed_at", null: false
    t.integer "confirmed_by_id", null: false
    t.datetime "created_at", null: false
    t.json "schedule", default: {}, null: false
    t.integer "shop_id", null: false
    t.datetime "updated_at", null: false
    t.index ["confirmed_by_id"], name: "index_shop_hours_on_confirmed_by_id"
    t.index ["shop_id"], name: "index_shop_hours_on_shop_id", unique: true
  end

  create_table "shop_photo_submissions", force: :cascade do |t|
    t.bigint "approved_photo_id"
    t.string "caption"
    t.datetime "created_at", null: false
    t.integer "shop_id", null: false
    t.datetime "updated_at", null: false
    t.index ["shop_id"], name: "index_shop_photo_submissions_on_shop_id"
  end

  create_table "shop_photos", force: :cascade do |t|
    t.string "caption"
    t.integer "contributor_id", null: false
    t.datetime "created_at", null: false
    t.integer "shop_id", null: false
    t.datetime "updated_at", null: false
    t.index ["contributor_id"], name: "index_shop_photos_on_contributor_id"
    t.index ["shop_id"], name: "index_shop_photos_on_shop_id"
  end

  create_table "shop_submissions", force: :cascade do |t|
    t.json "amenities", default: {}, null: false
    t.datetime "created_at", null: false
    t.integer "created_shop_id"
    t.boolean "duplicate_override", default: false, null: false
    t.json "hours", default: {}, null: false
    t.text "landmark", null: false
    t.decimal "latitude", precision: 10, scale: 7, null: false
    t.decimal "longitude", precision: 10, scale: 7, null: false
    t.string "name", null: false
    t.string "name_am", null: false
    t.integer "neighborhood_id", null: false
    t.string "price_band"
    t.datetime "updated_at", null: false
    t.index ["created_shop_id"], name: "index_shop_submissions_on_created_shop_id"
    t.index ["neighborhood_id"], name: "index_shop_submissions_on_neighborhood_id"
  end

  create_table "shops", force: :cascade do |t|
    t.json "amenities", default: {}, null: false
    t.integer "check_ins_count", default: 0, null: false
    t.datetime "created_at", null: false
    t.text "landmark", null: false
    t.decimal "latitude", precision: 10, scale: 7, null: false
    t.decimal "longitude", precision: 10, scale: 7, null: false
    t.integer "merged_into_id"
    t.string "name", null: false
    t.string "name_am", null: false
    t.string "name_am_key", null: false
    t.string "name_key", null: false
    t.integer "neighborhood_id", null: false
    t.string "price_band"
    t.string "slug", null: false
    t.integer "stamps_count", default: 0, null: false
    t.string "status", default: "pending", null: false
    t.integer "submitted_by_id", null: false
    t.datetime "updated_at", null: false
    t.index ["latitude", "longitude"], name: "index_shops_on_latitude_and_longitude"
    t.index ["merged_into_id"], name: "index_shops_on_merged_into_id"
    t.index ["name_am_key"], name: "index_shops_on_name_am_key"
    t.index ["name_key"], name: "index_shops_on_name_key"
    t.index ["neighborhood_id"], name: "index_shops_on_neighborhood_id"
    t.index ["slug"], name: "index_shops_on_slug", unique: true
    t.index ["status", "updated_at"], name: "index_shops_on_status_and_updated_at"
    t.index ["submitted_by_id"], name: "index_shops_on_submitted_by_id"
    t.check_constraint "check_ins_count >= 0 AND stamps_count >= 0", name: "shops_non_negative_counters"
    t.check_constraint "latitude BETWEEN -90 AND 90", name: "shops_latitude"
    t.check_constraint "longitude BETWEEN -180 AND 180", name: "shops_longitude"
    t.check_constraint "price_band IS NULL OR price_band IN ('budget', 'standard', 'premium', 'splurge')", name: "shops_price_band"
    t.check_constraint "status IN ('pending', 'live', 'hidden', 'closed', 'merged')", name: "shops_status"
  end

  create_table "stamps", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "earned_at", null: false
    t.integer "first_check_in_id", null: false
    t.integer "shop_id", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["earned_at"], name: "index_stamps_on_earned_at"
    t.index ["first_check_in_id"], name: "index_stamps_on_first_check_in_id"
    t.index ["shop_id"], name: "index_stamps_on_shop_id"
    t.index ["user_id", "shop_id"], name: "index_stamps_on_user_id_and_shop_id", unique: true
    t.index ["user_id"], name: "index_stamps_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "display_name", null: false
    t.string "email_address", null: false
    t.string "handle", null: false
    t.bigint "home_neighborhood_id"
    t.string "password_digest", null: false
    t.integer "stamps_count", default: 0, null: false
    t.string "trust_level", default: "newcomer", null: false
    t.datetime "updated_at", null: false
    t.integer "verified_check_ins_count", default: 0, null: false
    t.index ["email_address"], name: "index_users_on_email_address", unique: true
    t.index ["handle"], name: "index_users_on_handle", unique: true
    t.index ["home_neighborhood_id"], name: "index_users_on_home_neighborhood_id"
    t.check_constraint "trust_level IN ('newcomer', 'regular', 'curator', 'moderator')", name: "users_trust_level"
    t.check_constraint "verified_check_ins_count >= 0 AND stamps_count >= 0", name: "users_non_negative_counters"
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "awards", "badges"
  add_foreign_key "awards", "users"
  add_foreign_key "check_ins", "shops"
  add_foreign_key "check_ins", "users"
  add_foreign_key "contribution_confirmations", "contributions"
  add_foreign_key "contribution_confirmations", "users"
  add_foreign_key "contributions", "users"
  add_foreign_key "contributions", "users", column: "reviewed_by_id"
  add_foreign_key "leaderboard_entries", "users"
  add_foreign_key "reports", "users"
  add_foreign_key "reports", "users", column: "reviewed_by_id"
  add_foreign_key "sessions", "users"
  add_foreign_key "shop_edits", "shops"
  add_foreign_key "shop_hours", "shops"
  add_foreign_key "shop_hours", "users", column: "confirmed_by_id"
  add_foreign_key "shop_photo_submissions", "shop_photos", column: "approved_photo_id"
  add_foreign_key "shop_photo_submissions", "shops"
  add_foreign_key "shop_photos", "shops"
  add_foreign_key "shop_photos", "users", column: "contributor_id"
  add_foreign_key "shop_submissions", "neighborhoods"
  add_foreign_key "shop_submissions", "shops", column: "created_shop_id"
  add_foreign_key "shops", "neighborhoods"
  add_foreign_key "shops", "shops", column: "merged_into_id"
  add_foreign_key "shops", "users", column: "submitted_by_id"
  add_foreign_key "stamps", "check_ins", column: "first_check_in_id"
  add_foreign_key "stamps", "shops"
  add_foreign_key "stamps", "users"
  add_foreign_key "users", "neighborhoods", column: "home_neighborhood_id"
end
