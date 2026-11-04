# What a person can choose about their profile picture, the server's copy of
# web/src/design/doodle/catalog.json (a test checks the two match). The seed
# still draws the face's proportions; these traits pick the parts and colours.
# "paper" skin and "graphite" hair and eyes are the original pencil doodle.
module Avatar
  OPTIONS = {
    "skin" => %w[paper porcelain sand honey caramel mocha espresso],
    "hair" => %w[bald buzz side curls afro cornrows bun long locs],
    "hair_color" => %w[graphite black espresso chestnut auburn honey silver],
    "eyes" => %w[dot round almond],
    "eye_color" => %w[graphite brown hazel green blue grey],
    "nose" => %w[point round curve],
    "facial_hair" => %w[none stubble mustache beard],
    "freckles" => %w[none freckles],
    "glasses" => %w[none round square shades],
    "hat" => %w[none cap beanie wrap],
    "headphones" => %w[none headphones],
    "earrings" => %w[none studs hoops]
  }.transform_values(&:freeze).freeze

  COLORS = {
    "skin" => {
      "paper" => "#F8F4EC", "porcelain" => "#F6DFCB", "sand" => "#EBC6A2", "honey" => "#D8A372",
      "caramel" => "#B97D52", "mocha" => "#94603F", "espresso" => "#76492F"
    },
    "hair_color" => {
      "graphite" => "none", "black" => "#2B2522", "espresso" => "#4B2F22", "chestnut" => "#7B4A2B",
      "auburn" => "#A5482C", "honey" => "#CD9C50", "silver" => "#BDB7B0"
    },
    "eye_color" => {
      "graphite" => "#3A3733", "brown" => "#6A4026", "hazel" => "#8E6C2E", "green" => "#4E7B4B",
      "blue" => "#4A6E9C", "grey" => "#7C858C"
    },
    "hat" => { "none" => "none", "cap" => "none", "beanie" => "none", "wrap" => "#C98A2B" },
    "ink" => {
      "paper" => "#3A3733", "porcelain" => "#3A3733", "sand" => "#3A3733", "honey" => "#342C27",
      "caramel" => "#2A201C", "mocha" => "#1D1512", "espresso" => "#150F0C"
    },
    "headphones" => "#A9503A",
    "earrings" => "#C9971F",
    "eye_white" => "#FFFDF8"
  }.freeze

  module_function

  # Only known traits with known values, so a stale value falls back to the seed.
  def clean(traits)
    return {} unless traits.is_a?(Hash)

    traits.to_h.stringify_keys.select { |key, value| OPTIONS[key]&.include?(value) }
  end

  # Why a set of traits can't be saved, or nil when every one is known.
  def problems(traits)
    return "must be an object" unless traits.is_a?(Hash)

    unknown = traits.stringify_keys.reject { |key, value| OPTIONS[key]&.include?(value) }
    "has unknown values for #{unknown.keys.sort.join(', ')}" if unknown.any?
  end
end
