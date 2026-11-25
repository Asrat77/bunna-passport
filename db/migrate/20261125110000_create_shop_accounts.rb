class CreateShopAccounts < ActiveRecord::Migration[8.1]
  def change
    # Who runs a café on Bunna Passport. Someone asks to claim it from the
    # café's page (pending); a moderator approves or rejects. An approved
    # owner's photos and changes to hours, landmark and menu go live without
    # review.
    create_table :shop_accounts do |t|
      t.references :shop, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :status, null: false, default: "pending"
      t.string :note
      t.references :reviewed_by, foreign_key: { to_table: :users }
      t.datetime :reviewed_at
      t.timestamps
    end
    add_index :shop_accounts, %i[ shop_id user_id ], unique: true
    add_check_constraint :shop_accounts, "status IN ('pending', 'approved', 'rejected')", name: "shop_accounts_status"
  end
end
