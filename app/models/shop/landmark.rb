# How a café's landmark helps someone find it. The Google Maps import often
# left only the neighbourhood ("Bole, Addis Ababa"), a bare street, a plus
# code or a fragment of the shop's own name. Those are "weak": they don't
# tell anyone where to walk. A weak landmark can be swapped for a suggestion
# built from the nearest well-known place in config/landmarks.yml, keeping
# the street when there is one ("Cameroon St, 150 m from Edna Mall").
class Shop::Landmark
  Anchor = Data.define(:name, :name_am, :latitude, :longitude)

  ANCHORS = YAML.load_file(Rails.root.join("config/landmarks.yml")).map { |row| Anchor.new(**row.symbolize_keys) }.freeze

  # Close enough to just say "Near X", and too far for X to be any help.
  NEAR_METERS = 120
  MAX_METERS = 900
  SAME_PLACE_METERS = 60

  STREET = /\A(?:\d+\s+)?(?:[[:alpha:]]+\s+){0,3}(?:st|street|rd|road|ave|avenue)\.?\z/i
  GENERIC = /\A(?:unnamed road|sub[\s-]?city|ring road|kebele\s*\d*|woreda\s*\d*|addis ababa|ethiopia)\z/i

  attr_reader :shop

  def initialize(shop, anchors: ANCHORS)
    @shop = shop
    @anchors = anchors
  end

  def text
    shop.landmark.to_s.strip
  end

  def weak?
    return true if text.length < 4
    return true if text.match?(/\A[\d\s,.\-]+\z/) # "1", "Bole 3, 5", coordinates
    return true if text.match?(/\A[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}/i) # plus code
    return true if text.match?(/\ABL_\d/i) # OSM block codes like "BL_03_575 St"
    return true if text.match?(GENERIC)
    return true if neighborhood_only?
    return true if text.match?(STREET)
    return true if repeats_name?

    false
  end

  # A better landmark for a weak one, or nil when there's nothing better to
  # say (no well-known place close enough).
  def suggestion
    anchor, meters = nearest_anchor
    return unless anchor && meters <= MAX_METERS

    near = meters <= NEAR_METERS ? "near #{anchor.name}" : "#{round_to_fifty(meters)} m from #{anchor.name}"
    [ street, near ].compact.join(", ").then { |value| value.sub(/\A(\w)/) { $1.upcase } }
  end

  def nearest_anchor
    @anchors
      .reject { |anchor| same_place?(anchor) }
      .map { |anchor| [ anchor, distance_to(anchor) ] }
      .min_by(&:last)
  end

  private
    # Nothing left once neighbourhood names, the city, admin words and
    # numbers are taken out: "Bole, Addis Ababa", "Bole 3, 5", "Sub City".
    def neighborhood_only?
      names = (Neighborhood::DEFAULTS.map { |row| row[:name] } + [ shop.neighborhood&.name ]).compact.uniq
        .sort_by { |name| -name.length }.map { |name| Regexp.escape(name) }
      text.gsub(/\b(?:#{names.join("|")}|addis\s*abab?a|sub[\s-]?city|woreda|werada|kebele)\b/i, " ")
        .gsub(/[\d\s,.\-#\/]+/, "").empty?
    end

    def repeats_name?
      key = Shop::Name.normalize(shop.name)
      key.length >= 4 && Shop::Name.normalize(text.split(",").first).start_with?(key.first(10))
    end

    # The street, if the weak landmark has one worth keeping.
    def street
      text.split(",").map(&:strip).reverse.find do |part|
        part.match?(STREET) && !part.match?(/\ABL_\d/i) && !part.match?(/\Aunnamed/i)
      end&.sub(/\A\d+\s+/, "")
    end

    # A hotel shouldn't be "near" itself: same spot and a shared name word.
    def same_place?(anchor)
      return true if Shop::Name.similarity(anchor.name, shop.name) >= 0.6

      shared = significant_words(anchor.name) & significant_words(shop.name)
      shared.any? && distance_to(anchor) <= SAME_PLACE_METERS
    end

    def significant_words(name)
      name.downcase.scan(/[[:alpha:]]{4,}/) - %w[ hotel church mall center centre tower hospital addis ]
    end

    def distance_to(anchor)
      shop.distance_from(latitude: anchor.latitude, longitude: anchor.longitude)
    end

    def round_to_fifty(meters)
      [ (meters / 50.0).round * 50, 50 ].max
    end
end
