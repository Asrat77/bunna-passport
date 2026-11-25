class CreateShopMenuItems < ActiveRecord::Migration[8.1]
  def change
    # What a café serves and for how much, shown on its page in the Mini
    # App. Moderators keep it in the console for now; owners will once they
    # can claim their café.
    create_table :shop_menu_items do |t|
      t.references :shop, null: false, foreign_key: true
      t.string :name, null: false
      t.string :name_am
      t.integer :price_birr
      t.string :category, null: false, default: "coffee"
      t.integer :position, null: false, default: 0
      t.boolean :available, null: false, default: true
      t.timestamps
    end
    add_check_constraint :shop_menu_items, "price_birr IS NULL OR price_birr BETWEEN 1 AND 100000", name: "shop_menu_items_price_birr"
  end
end
