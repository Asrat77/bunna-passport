class AddLanguageToUsers < ActiveRecord::Migration[8.1]
  def change
    # The language the bot writes to someone in: what their Telegram app is
    # set to, or what they picked in the Mini App. Null until we know.
    add_column :users, :language, :string
    add_check_constraint :users, "language IN ('en', 'am')", name: "users_language"
  end
end
