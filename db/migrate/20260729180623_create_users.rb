class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :email_address, null: false
      t.string :password_digest, null: false
      t.string :handle, null: false
      t.string :display_name, null: false
      t.bigint :home_neighborhood_id
      t.string :trust_level, null: false, default: "newcomer"
      t.integer :verified_check_ins_count, null: false, default: 0
      t.integer :stamps_count, null: false, default: 0

      t.timestamps
    end
    add_index :users, :email_address, unique: true
    add_index :users, :handle, unique: true
    add_index :users, :home_neighborhood_id
    add_check_constraint :users,
      "trust_level IN ('newcomer', 'regular', 'curator', 'moderator')",
      name: "users_trust_level"
    add_check_constraint :users,
      "verified_check_ins_count >= 0 AND stamps_count >= 0",
      name: "users_non_negative_counters"
  end
end
