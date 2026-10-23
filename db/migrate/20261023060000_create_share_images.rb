class CreateShareImages < ActiveRecord::Migration[8.1]
  def change
    # One rendered share card per check-in, size and doodle choice. The token
    # is the only way to reach the image, since Telegram fetches it unsigned.
    create_table :share_images do |t|
      t.references :check_in, null: false, foreign_key: true
      t.string :format, null: false
      t.boolean :doodle, null: false, default: true
      t.string :token, null: false
      t.integer :version, null: false
      t.timestamps
    end
    add_index :share_images, :token, unique: true
    add_index :share_images, %i[ check_in_id format doodle ], unique: true
  end
end
