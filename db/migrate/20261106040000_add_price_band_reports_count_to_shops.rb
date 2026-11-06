# How many people's reported prices set a shop's price_band. Zero means the
# band came from the catalog or a moderator, or nobody has reported yet.
class AddPriceBandReportsCountToShops < ActiveRecord::Migration[8.1]
  def change
    add_column :shops, :price_band_reports_count, :integer, null: false, default: 0
  end
end
