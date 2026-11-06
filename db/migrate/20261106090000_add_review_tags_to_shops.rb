class AddReviewTagsToShops < ActiveRecord::Migration[8.1]
  # How many reviews picked each quick tag, kept on the shop so the catalog
  # can carry it and the apps can filter by "quiet" or "good for work"
  # without a request per café.
  def up
    add_column :shops, :review_tags, :json, default: {}, null: false

    Shop.reset_column_information
    Shop.where(id: CheckIn.where("json_array_length(tags) > 0").select(:shop_id)).find_each(&:refresh_review_tags!)
  end

  def down
    remove_column :shops, :review_tags
  end
end
