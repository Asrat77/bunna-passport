class CreateFriendships < ActiveRecord::Migration[8.1]
  def change
    # Friendship is mutual, stored as one row each way so "my friends" is a
    # single indexed lookup from either side.
    create_table :friendships do |t|
      t.references :user, null: false, foreign_key: true
      t.references :friend, null: false, foreign_key: { to_table: :users }
      t.timestamps
    end
    add_index :friendships, %i[ user_id friend_id ], unique: true
    add_check_constraint :friendships, "user_id != friend_id", name: "friendships_not_self"

    # The key in someone's invite link. Generated on first use, so existing
    # accounts need no backfill, and replaced when they revoke a link.
    add_column :users, :invite_token, :string
    add_index :users, :invite_token, unique: true

    # Whether friends see your verified visits in their feed.
    add_column :users, :shares_visits, :boolean, null: false, default: true
  end
end
