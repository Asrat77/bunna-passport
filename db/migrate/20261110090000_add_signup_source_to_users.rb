class AddSignupSourceToUsers < ActiveRecord::Migration[8.1]
  def change
    # Which link brought someone in: a café's sticker ("qr-12"), a post
    # ("ig-addiscoffee"), a friend's invite ("invite") or a shared card
    # ("card"). Set once, when the account is made; null when they came
    # in without a tagged link. See LaunchLink.
    add_column :users, :signup_source, :string
    add_index :users, :signup_source
  end
end
