class AddTelegramAndDoodleToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :telegram_user_id, :bigint
    add_index :users, :telegram_user_id, unique: true

    # Someone who arrives through Telegram has neither an email nor a password;
    # either sign-in still needs its own credential, checked in the model.
    change_column_null :users, :email_address, true
    change_column_null :users, :password_digest, true
    add_check_constraint :users, "email_address IS NOT NULL OR telegram_user_id IS NOT NULL",
      name: "users_have_a_sign_in"

    add_column :users, :avatar_seed, :string
    add_column :users, :shares_cup_status, :boolean, default: true, null: false
  end
end
