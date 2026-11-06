class CreateCheckInReactions < ActiveRecord::Migration[8.1]
  def change
    # One reaction per friend per visit; changing it replaces the kind.
    create_table :check_in_reactions do |t|
      t.references :check_in, null: false, foreign_key: true, index: false
      t.references :user, null: false, foreign_key: true
      t.string :kind, null: false
      t.timestamps
    end
    add_index :check_in_reactions, %i[ check_in_id user_id ], unique: true
    add_check_constraint :check_in_reactions, "kind IN ('coffee', 'heart', 'fire', 'clap')", name: "check_in_reactions_kind"

    # The evening friends round-up from the bot: on unless turned off, and
    # when it last went out, so each one covers only what is new.
    add_column :users, :friend_updates, :boolean, null: false, default: true
    add_column :users, :last_friend_digest_at, :datetime
  end
end
