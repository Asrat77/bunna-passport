# What a neighbourhood's live cafés are still missing before launch: a photo,
# a landmark someone can walk to, or a second entry for the same place. Feeds
# Console → Data gaps and `bin/rails bunna:data_gaps`.
class Shop::Gaps
  Row = Data.define(:shop, :missing_photo, :weak_landmark, :suggestion, :duplicates) do
    def any? = missing_photo || weak_landmark || duplicates.any?
  end

  attr_reader :neighborhoods

  def initialize(neighborhoods)
    @neighborhoods = Array(neighborhoods)
  end

  def shops
    @shops ||= Shop.live.where(neighborhood: neighborhoods).includes(:neighborhood, :photos).alphabetically.to_a
  end

  def rows
    @rows ||= shops.map do |shop|
      landmark = Shop::Landmark.new(shop)
      weak = landmark.weak?
      Row.new(
        shop: shop,
        missing_photo: shop.photos.empty?,
        weak_landmark: weak,
        suggestion: (landmark.suggestion if weak),
        duplicates: duplicates_of(shop)
      )
    end
  end

  def gaps
    rows.select(&:any?)
  end

  def summary
    {
      shops: rows.size,
      missing_photo: rows.count(&:missing_photo),
      weak_landmark: rows.count(&:weak_landmark),
      suggested_landmark: rows.count(&:suggestion),
      duplicate_pairs: duplicate_pairs.size,
      complete: rows.count { |row| !row.any? }
    }
  end

  # Each likely duplicate once, as [shop, other] with the lower id first.
  def duplicate_pairs
    rows.flat_map { |row| row.duplicates.map { |other| [ row.shop, other ].sort_by(&:id) } }.uniq
  end

  private
    def duplicates_of(shop)
      Shop.live.where.not(id: shop.id).includes(:neighborhood)
        .duplicate_candidates(name: shop.name, name_am: shop.name_am, latitude: shop.latitude, longitude: shop.longitude)
    end
end
