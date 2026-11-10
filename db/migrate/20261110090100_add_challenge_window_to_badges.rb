class AddChallengeWindowToBadges < ActiveRecord::Migration[8.1]
  def change
    # A challenge badge (criterion "challenge_shops", like Bole 10) counts
    # verified visits to a fixed list of cafés between two dates, and is only
    # on offer while that window is open.
    add_column :badges, :starts_at, :datetime
    add_column :badges, :ends_at, :datetime
    add_column :badges, :shop_ids, :json
  end
end
