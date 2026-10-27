# The hero passport stamp for share cards. Geometry and seeds mirror
# web/src/design/stamp/geometry.ts and InkStamp.tsx so the card prints the
# stamp the user just saw in the ceremony; a shared fixture keeps them equal.
#
# Everything is in a 232 × 232 viewBox. librsvg can't lay text along a path,
# so both renderers place the ring text one glyph at a time: each glyph
# centred on its spot of the arc and turned to the tangent.
class ShareCard::InkStamp
  VIEWBOX = 232
  CENTER = 116

  RINGS = [
    { r: 110, width: 4, dash: "9 7", dotted: false },
    { r: 104, width: 1.2, dash: "4 5", dotted: false },
    { r: 77, width: 0.8, dash: "2 4", dotted: true },
    { r: 72, width: 2, dash: "4 5", dotted: false }
  ].freeze
  # Unearned stamps keep only the outer and inner rings, dashed.
  EMPTY_RINGS = [ RINGS[0], RINGS[3] ].freeze

  # Latin over the top, Amharic under the bottom (read upright), each centred.
  # Top glyphs sit on r86; bottom glyphs hang from r95 so their caps meet r86.
  RING_ARCS = [
    { text: "BUNNA PASSPORT", size: 12.5, letter_spacing: 4, radius: 86, centre: -90, direction: 1 },
    { text: "ቡና ፓስፖርት", size: 15.5, letter_spacing: 4, radius: 95, centre: 90, direction: -1 }
  ].freeze
  RING_DOTS = [ [ CENTER - 90, CENTER ], [ CENTER + 90, CENTER ] ].freeze
  RING_DOT_RADIUS = 2.6

  # Phosphor's coffee-bean-fill (256 grid), set small above the name.
  BEAN_PATH = "M71.22,190.47a108.88,108.88,0,0,1-33.84,9.16,4,4,0,0,1-3.89-2c-8.67-15.28-11.52-34.29-8-55.15,4.49-26.92,19.09-53.87,41.12-75.9s49-36.63,75.9-41.12c22.79-3.79,43.37,0,59.29,10.6a4,4,0,0,1-1.25,7.23,121,121,0,0,0-21.82,7.46c-21.77,9.9-49.6,31.06-58.52,75.7C114.1,156.73,97.63,178.27,71.22,190.47ZM222.51,58.38a4,4,0,0,0-3.88-2,108.5,108.5,0,0,0-33.85,9.16c-26.41,12.2-42.88,33.74-48.94,64-8.93,44.64-36.75,65.8-58.52,75.7a121,121,0,0,1-21.82,7.46A4,4,0,0,0,54.27,220c11.87,7.92,26.32,12,42.35,12a103.66,103.66,0,0,0,16.92-1.44c26.91-4.49,53.87-19.09,75.9-41.12s36.63-49,41.12-75.9C234,92.68,231.18,73.66,222.51,58.38Z".freeze
  BEAN_TRANSFORM = "translate(#{CENTER - 8} 54) scale(0.0625)".freeze

  ONE_LINE = { name: 102, amharic: 125, rule: 137, date: 156 }.freeze
  # The second name line sits on 114; the first rises with the size.
  TWO_LINES = { name: 114, amharic: 134, rule: 143, date: 160 }.freeze
  NAME_LETTER_SPACING = 1
  ONE_LINE_MIN = 17
  TWO_LINE_MAX = 20
  TWO_LINE_MIN = 10
  RULE = { x1: 80, x2: 152, width: 1.2 }.freeze
  DATE_SIZE = 12
  DATE_LETTER_SPACING = 2

  # Clay is the light theme's primary; metals echo LEVEL_METAL in Seal.
  INK = {
    "clay" => "#872F1D",
    "bronze" => "#8C5A2B",
    "silver" => "#5E6A78",
    "gold" => "#A8811A",
    "diamond" => "#2A6F7F",
    "none" => "#B9A58E"
  }.freeze
  # Unearned stamps print their words a shade darker than the rings.
  EMPTY_TEXT = "#806C61".freeze

  # Advance widths in ems. Geist Mono is 0.6 for every glyph; the Ethiopic
  # letters fall back to Noto Sans Ethiopic, read from its hmtx table.
  MONO_ADVANCE = 0.6
  ETHIOPIC_ADVANCE = {
    "ቡ" => 0.740, "ና" => 0.511, "ፓ" => 0.611, "ስ" => 0.618,
    "ፖ" => 0.671, "ር" => 0.510, "ት" => 0.601
  }.freeze

  MONTHS = %w[JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC].freeze

  class << self
    # Short names print large on one line; longer ones break at the space
    # that best balances two lines; anything still too long is cut.
    # Returns [lines, size].
    def name_layout(name)
      single = [ 25, fit(128, utf16_length(name)) ].min
      words = name.split(" ").reject(&:empty?)
      if single >= ONE_LINE_MIN || words.size < 2
        return single >= TWO_LINE_MIN ? [ [ name ], single ] : [ [ cut(name, 128) ], TWO_LINE_MIN ]
      end

      best = [ name, "" ]
      (1...words.size).each do |i|
        pair = [ words[0...i].join(" "), words[i..].join(" ") ]
        best = pair if pair.map { |line| utf16_length(line) }.max < best.map { |line| utf16_length(line) }.max
      end
      size = [ TWO_LINE_MAX, fit(120, best.map { |line| utf16_length(line) }.max) ].min
      return [ best, size ] if size >= TWO_LINE_MIN

      [ best.map { |line| cut(line, 120) }, TWO_LINE_MIN ]
    end

    # Baselines for the name lines.
    def name_baselines(lines, size)
      return [ ONE_LINE[:name] ] if lines.size == 1

      [ js_round((TWO_LINES[:name] - size * 1.15) * 100) / 100.0, TWO_LINES[:name] ]
    end

    # The Amharic line shrinks a little for long names, never below 11.
    def amharic_font_size(text)
      [ 11, [ 16, 124.0 / (utf16_length(text) * 0.68) ].min ].max
    end

    # Turbulence seed for the speckle and wobble, stable per shop name.
    def ink_noise_seed(name)
      (ShareCard::Seed.fnv1a(name) % 89) + 2
    end

    # A deterministic tilt within about ±12°, so a stamp never re-rotates.
    def rotation(key)
      h = ShareCard::Seed.fnv1a("rot:#{key}")
      js_round(((h % 2401) / 100.0 - 12) * 10) / 10.0
    end

    # "21 OCT 2026", the way a rubber date stamp prints it.
    def date(time)
      "#{time.day} #{MONTHS[time.month - 1]} #{time.year}"
    end

    # [character, x, y, degrees, size] for each ring glyph, centred on its
    # spot of the arc and turned to the tangent.
    def ring_glyphs
      @ring_glyphs ||= RING_ARCS.flat_map do |arc|
        chars = arc[:text].each_char.to_a
        advances = chars.map { |char| (ETHIOPIC_ADVANCE[char] || MONO_ADVANCE) * arc[:size] }
        total = advances.sum(0.0) + arc[:letter_spacing] * (chars.size - 1)
        offset = -total / 2
        chars.each_with_index.filter_map do |char, i|
          middle = offset + advances[i] / 2
          offset += advances[i] + arc[:letter_spacing]
          next if char == " "

          angle = arc[:centre] * Math::PI / 180 + arc[:direction] * middle / arc[:radius]
          [
            char,
            round2(CENTER + Math.cos(angle) * arc[:radius]),
            round2(CENTER + Math.sin(angle) * arc[:radius]),
            round2(angle * 180 / Math::PI + 90 * arc[:direction]),
            arc[:size]
          ]
        end
      end
    end

    private
      def utf16_length(value)
        value.encode("UTF-16LE").bytesize / 2
      end

      def fit(width, length)
        width.to_f / (length * 0.7 + 0.2)
      end

      def cut(line, width)
        room = ((width.to_f / TWO_LINE_MIN - 0.2) / 0.7).floor
        utf16_length(line) > room ? "#{line[0, room - 1].rstrip}…" : line
      end

      def round2(number)
        js_round(number * 100) / 100.0
      end

      # JavaScript's Math.round: halves go up, not away from zero.
      def js_round(number)
        (number + 0.5).floor
      end
  end

  # `name` is the Latin name, `amharic` the Amharic line (name, then
  # neighbourhood), `date` already formatted. `id` keeps filter ids unique
  # when a card holds more than one SVG fragment.
  def initialize(name:, amharic:, date:, level: "clay", id: "stamp")
    @shop_name = name.to_s
    @name = @shop_name.upcase
    @amharic = amharic.to_s
    @date = date.to_s
    @level = INK.key?(level.to_s) ? level.to_s : "clay"
    @id = id
  end

  # An SVG fragment (defs + group) in the 232 viewBox. An unearned stamp is
  # the empty slot: dashed rings and the shop's words, no ring band.
  def to_svg
    ink = INK.fetch(@level)
    earned = @level != "none"
    words = earned ? ink : EMPTY_TEXT
    noise = self.class.ink_noise_seed(@shop_name)
    lines, size = self.class.name_layout(@name)
    rows = lines.size > 1 ? TWO_LINES : ONE_LINE
    baselines = self.class.name_baselines(lines, size)

    rings = (earned ? RINGS : EMPTY_RINGS).map do |ring|
      dash = earned && !ring[:dotted] ? "" : %( stroke-dasharray="#{ring[:dash]}")
      %(<circle cx="#{CENTER}" cy="#{CENTER}" r="#{ring[:r]}" fill="none" stroke="#{ink}" stroke-width="#{ring[:width]}"#{dash}/>)
    end

    band = []
    if earned
      band = self.class.ring_glyphs.map do |char, x, y, degrees, glyph_size|
        %(<text x="#{x}" y="#{y}" transform="rotate(#{degrees} #{x} #{y})" text-anchor="middle" font-family="Geist Mono, Noto Sans Ethiopic, monospace" font-size="#{glyph_size}">#{escape(char)}</text>)
      end
      band += RING_DOTS.map { |x, y| %(<circle cx="#{x}" cy="#{y}" r="#{RING_DOT_RADIUS}"/>) }
    end

    name_text = lines.zip(baselines).map do |line, y|
      %(<text x="#{CENTER}" y="#{y}" text-anchor="middle" font-family="Geist, sans-serif" font-weight="700" letter-spacing="#{NAME_LETTER_SPACING}" font-size="#{size.round(3)}">#{escape(line)}</text>)
    end

    filter = earned ? %( filter="url(##{@id}-ink)") : ""

    <<~SVG
      <defs>
        <filter id="#{@id}-ink" x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="#{noise}" result="speck"/>
          <feColorMatrix in="speck" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.6 2.1" result="mask"/>
          <feComposite in="SourceGraphic" in2="mask" operator="in" result="inked"/>
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="1" seed="#{noise}" result="warp"/>
          <feDisplacementMap in="inked" in2="warp" scale="2.6" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>
      <g#{filter} fill="#{words}">
        #{rings.join("\n  ")}
        #{band.join("\n  ")}
        <path d="#{BEAN_PATH}" transform="#{BEAN_TRANSFORM}"/>
        #{name_text.join("\n  ")}
        <text x="#{CENTER}" y="#{rows[:amharic]}" text-anchor="middle" font-family="Noto Serif Ethiopic, serif" font-weight="700" font-size="#{self.class.amharic_font_size(@amharic).round(3)}">#{escape(@amharic)}</text>
        <line x1="#{RULE[:x1]}" y1="#{rows[:rule]}" x2="#{RULE[:x2]}" y2="#{rows[:rule]}" stroke="#{words}" stroke-width="#{RULE[:width]}"/>
        <text x="#{CENTER}" y="#{rows[:date]}" text-anchor="middle" font-family="Geist Mono, monospace" font-size="#{DATE_SIZE}" letter-spacing="#{DATE_LETTER_SPACING}">#{escape(@date)}</text>
      </g>
    SVG
  end

  private
    def escape(text)
      ERB::Util.html_escape(text)
    end
end
