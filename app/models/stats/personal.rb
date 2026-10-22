# Everything one person's passport says about their coffee habit, built from
# the visits we verified. Flagged and rejected visits are left out, as they
# are on the boards.
class Stats::Personal
  TOP_AREAS = 5

  attr_reader :user, :now

  def initialize(user, now: Time.current)
    @user = user
    @now = now
  end

  def as_json(*)
    {
      totals: totals,
      first_cup_at: times.first&.iso8601,
      last_cup_at: times.last&.iso8601,
      city_rank: city_rank,
      streaks: streaks,
      favorite_cafe: favorite_cafe,
      stamp_levels: stamp_levels,
      by_hour: Stats::Clock.by_hour(times),
      by_weekday: Stats::Clock.by_weekday(times),
      by_month: Stats::Clock.by_month(times, now: now),
      top_areas: top_areas,
      favorite_drink: favorite_drink,
      average_rating: average_rating
    }
  end

  private
    def check_ins
      user.check_ins.verified
    end

    def times
      @times ||= check_ins.order(:occurred_at).pluck(:occurred_at)
    end

    def stamps
      @stamps ||= user.stamps.includes(shop: :neighborhood).to_a
    end

    def totals
      {
        cups: times.size,
        cafes: stamps.size,
        areas: stamps.map { |stamp| stamp.shop.neighborhood_id }.uniq.size,
        reviews: check_ins.where("rating IS NOT NULL OR (note IS NOT NULL AND TRIM(note) != '')").count,
        contributions: user.contributions.accepted.count,
        badges: user.awards.count,
        catalog_cafes: Shop.live.count,
        catalog_areas: Shop.live.distinct.count(:neighborhood_id),
        catalog_badges: Badge.count
      }
    end

    # Where you sit among everyone with a verified cup, by lifetime cups.
    def city_rank
      return if times.empty?

      ahead = User.where("verified_check_ins_count > ?", user.verified_check_ins_count).count
      { rank: ahead + 1, drinkers: User.where("verified_check_ins_count > 0").count }
    end

    def streaks
      weeks = times.map { |time| Stats::Clock.week(time) }.uniq
      days = times.map { |time| Stats::Clock.coffee_day(time) }.tally
      {
        current_weeks: current_run(weeks),
        longest_weeks: longest_run(weeks),
        coffee_days: days.size,
        best_day_cups: days.values.max || 0
      }
    end

    # Forgiving, like the passport's streak: this week only breaks it once
    # it is over without a cup.
    def current_run(weeks)
      known = weeks.to_set
      cursor = Stats::Clock.week(now)
      cursor -= 7 unless known.include?(cursor)
      count = 0
      while known.include?(cursor)
        count += 1
        cursor -= 7
      end
      count
    end

    def longest_run(weeks)
      weeks.sort.chunk_while { |earlier, later| later == earlier + 7 }.map(&:size).max || 0
    end

    def favorite_cafe
      stamp = stamps.max_by { |s| [ s.check_ins_count, -s.earned_at.to_i ] }
      return unless stamp && stamp.check_ins_count.positive?

      { shop: shop_json(stamp.shop), cups: stamp.check_ins_count, level: stamp.level }
    end

    def stamp_levels
      counts = stamps.map(&:level).tally
      Stamp::LEVELS.keys.index_with { |level| counts.fetch(level, 0) }
    end

    def top_areas
      check_ins.joins(shop: :neighborhood)
        .group("neighborhoods.id", "neighborhoods.name", "neighborhoods.name_am").count
        .map { |(id, name, name_am), cups| { id: id, name: name, name_am: name_am, cups: cups } }
        .sort_by { |area| [ -area[:cups], area[:name] ] }
        .first(TOP_AREAS)
    end

    def favorite_drink
      Stats::Drinks.top(check_ins, limit: 1).first
    end

    def average_rating
      check_ins.rating_average
    end

    def shop_json(shop)
      { id: shop.id, name: shop.name, name_am: shop.name_am }
    end
end
