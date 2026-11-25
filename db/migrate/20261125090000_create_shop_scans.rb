class CreateShopScans < ActiveRecord::Migration[8.1]
  def change
    # Every Mini App open whose link named a café (a QR stand or sticker),
    # one row per launch. `opened_at` is Telegram's signed auth_date, which
    # stays the same when the same launch reloads, so a reload can't count
    # twice. `first_open` marks the launch that made the account.
    create_table :shop_scans do |t|
      t.references :shop, null: false, foreign_key: true, index: false
      t.references :user, null: false, foreign_key: true, index: false
      t.boolean :first_open, null: false, default: false
      t.datetime :opened_at, null: false
      t.timestamps
    end
    add_index :shop_scans, %i[ shop_id opened_at ]
    add_index :shop_scans, %i[ user_id shop_id opened_at ], unique: true
  end
end
