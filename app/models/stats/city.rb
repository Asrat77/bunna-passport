# What the whole city's passports add up to. Cheap enough to build on
# request at Addis scale, but cached briefly since every Stats visit asks.
class Stats::City
  CACHE_FOR = 10.minutes
  TOP = 5
  MIN_RATINGS = 3

  attr_reader :now

  def self.cached
    Rails.cache.fetch("stats/city", expires_in: CACHE_FOR) { new.as_json }
  end

  def initialize(now: Time.current)
    @now = now
  end

  def as_json(*)
    times = cups.pluck(:occurred_at)
    {
      totals: totals,
      by_hour: Stats::Clock.by_hour(times),
      by_weekday: Stats::Clock.by_weekday(times),
      by_month: Stats::Clock.by_month(times, now: now),
      top_cafes: top_cafes,
      rising_cafes: rising_cafes,
      top_rated: top_rated,
      areas: areas,
      top_drinks: Stats::Drinks.top(cups, limit: TOP),
      price_bands: price_bands,
      generated_at: now.iso8601
    }
  end

  private
    def cups
      CheckIn.verified
    end

    def week_start
      Stats::Clock.local(now).beginning_of_week
    end

    def live_shops
      @live_shops ||= Shop.live.to_a
    end

    def totals
      week = cups.where(occurred_at: week_start..)
      {
        cafes: live_shops.size,
        areas: live_shops.map(&:neighborhood_id).uniq.size,
        cups: cups.count,
        cups_this_week: week.count,
        drinkers: cups.distinct.count(:user_id),
        drinkers_this_week: week.distinct.count(:user_id),
        stamps: Stamp.count,
        reviews: CheckIn.reviews.count,
        contributions: Contribution.accepted.count,
        unstamped_cafes: live_shops.count { |shop| shop.stamps_count.zero? },
        jebena_cafes: live_shops.count { |shop| shop.amenities["jebena_service"] },
        cafes_with_hours: Shop::Hours.joins(:shop).merge(Shop.live).count,
        new_cafes: live_shops.count { |shop| shop.created_at >= 30.days.before(now) }
      }
    end

    def top_cafes
      live_shops.select { |shop| shop.check_ins_count.positive? }
        .sort_by { |shop| [ -shop.check_ins_count, shop.name ] }
        .first(TOP)
        .map { |shop| { shop: shop_json(shop), cups: shop.check_ins_count } }
    end

    def rising_cafes
      ranked(cups.where(occurred_at: week_start..).joins(:shop).merge(Shop.live).group(:shop_id).count)
        .map { |shop, count| { shop: shop_json(shop), cups: count } }
    end

    def top_rated
      averages = cups.rated.joins(:shop).merge(Shop.live).group(:shop_id)
        .having("COUNT(*) >= ?", MIN_RATINGS).pluck(:shop_id, Arel.sql("AVG(rating)"), Arel.sql("COUNT(*)"))
      by_id = live_shops.index_by(&:id)
      averages
        .sort_by { |shop_id, average, count| [ -average.to_f, -count, by_id[shop_id].name ] }
        .first(TOP)
        .map { |shop_id, average, count| { shop: shop_json(by_id[shop_id]), average: average.to_f.round(2), ratings: count } }
    end

    def areas
      week = cups.where(occurred_at: week_start..).joins(:shop).group("shops.neighborhood_id").count
      all_time = cups.joins(:shop).group("shops.neighborhood_id").count
      cafes = live_shops.map(&:neighborhood_id).tally
      Neighborhood.where(id: cafes.keys).map do |area|
        {
          id: area.id,
          name: area.name,
          name_am: area.name_am,
          cafes: cafes.fetch(area.id),
          cups: all_time.fetch(area.id, 0),
          cups_this_week: week.fetch(area.id, 0)
        }
      end.sort_by { |area| [ -area[:cafes], area[:name] ] }
    end

    def price_bands
      counts = live_shops.filter_map(&:price_band).tally
      Shop.price_bands.keys.index_with { |band| counts.fetch(band, 0) }
    end

    def ranked(counts_by_shop_id)
      by_id = live_shops.index_by(&:id)
      counts_by_shop_id.filter_map { |id, count| [ by_id[id], count ] if by_id[id] }
        .sort_by { |shop, count| [ -count, shop.name ] }
        .first(TOP)
    end

    def shop_json(shop)
      { id: shop.id, name: shop.name, name_am: shop.name_am }
    end
end
