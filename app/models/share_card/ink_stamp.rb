# The hero passport stamp for share cards. Geometry and seeds mirror
# web/src/design/stamp/geometry.ts and InkStamp.tsx so the card prints the
# stamp the user just saw in the ceremony; a shared fixture keeps them equal.
#
# Everything is in a 232 × 232 viewBox. librsvg can't lay text along a path,
# so the ring text is placed one glyph at a time, the way a browser places
# a <textPath>: each glyph centred on its spot of the r86 circle and turned
# to the tangent.
class ShareCard::InkStamp
  VIEWBOX = 232
  CENTER = 116

  RINGS = [
    { r: 110, width: 4, dash: "9 7" },
    { r: 104, width: 1.2, dash: "4 5" },
    { r: 72, width: 2, dash: "4 5" }
  ].freeze

  RING_TEXT = "BUNNA PASSPORT · ቡና ፓስፖርት · ADDIS ABABA · ".freeze
  RING_RADIUS = 86
  RING_SIZE = 12.5
  RING_LETTER_SPACING = 2.6

  NAME_Y = 102
  NAME_LETTER_SPACING = 1
  AMHARIC_Y = 125
  AMHARIC_SIZE = 16
  RULE = { x1: 80, x2: 152, y: 137, width: 1.2 }.freeze
  DATE_Y = 156
  DATE_SIZE = 12
  DATE_LETTER_SPACING = 2

  # Clay is the light theme's primary; metals mirror LEVEL_PAINT in Seal.
  INK = {
    "clay" => "#872F1D",
    "bronze" => "#8C5A2B",
    "silver" => "#71757A",
    "gold" => "#A8811A",
    "diamond" => "#2A6F7F",
    "none" => "#B9A58E"
  }.freeze

  # Advance widths in ems. Geist Mono is 0.6 for every glyph; the Ethiopic
  # letters fall back to Noto Sans Ethiopic, read from its hmtx table.
  MONO_ADVANCE = 0.6
  ETHIOPIC_ADVANCE = {
    "ቡ" => 0.740, "ና" => 0.511, "ፓ" => 0.611, "ስ" => 0.618,
    "ፖ" => 0.671, "ር" => 0.510, "ት" => 0.601
  }.freeze

  MONTHS = %w[JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC].freeze

  class << self
    # Long names shrink so they stay inside the inner ring.
    def name_font_size(name)
      [ 25, 138.0 / (utf16_length(name) * 0.7 + 0.2) ].min
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

    # [character, x, y, degrees] for each ring glyph.
    def ring_glyphs
      @ring_glyphs ||= begin
        offset = 0.0
        RING_TEXT.each_char.map do |char|
          advance = (ETHIOPIC_ADVANCE[char] || MONO_ADVANCE) * RING_SIZE
          middle = offset + advance / 2
          offset += advance + RING_LETTER_SPACING
          # The arc starts at the left (x 30) and runs clockwise over the top.
          angle = Math::PI + middle / RING_RADIUS
          x = CENTER + Math.cos(angle) * RING_RADIUS
          y = CENTER + Math.sin(angle) * RING_RADIUS
          [ char, x.round(2), y.round(2), (angle * 180 / Math::PI + 90).round(2) ]
        end
      end
    end

    private
      def utf16_length(value)
        value.encode("UTF-16LE").bytesize / 2
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

  # An SVG fragment (defs + group) in the 232 viewBox.
  def to_svg
    ink = INK.fetch(@level)
    earned = @level != "none"
    noise = self.class.ink_noise_seed(@shop_name)

    rings = RINGS.map do |ring|
      dash = earned ? "" : %( stroke-dasharray="#{ring[:dash]}")
      %(<circle cx="#{CENTER}" cy="#{CENTER}" r="#{ring[:r]}" fill="none" stroke="#{ink}" stroke-width="#{ring[:width]}"#{dash}/>)
    end

    ring_text = self.class.ring_glyphs.map do |char, x, y, degrees|
      next if char == " "

      %(<text x="#{x}" y="#{y}" transform="rotate(#{degrees} #{x} #{y})" text-anchor="middle" font-family="Geist Mono, Noto Sans Ethiopic, monospace" font-size="#{RING_SIZE}">#{escape(char)}</text>)
    end

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
      <g filter="url(##{@id}-ink)" fill="#{ink}">
        #{rings.join("\n  ")}
        #{ring_text.compact.join("\n  ")}
        <text x="#{CENTER}" y="#{NAME_Y}" text-anchor="middle" font-family="Geist, sans-serif" font-weight="700" letter-spacing="#{NAME_LETTER_SPACING}" font-size="#{self.class.name_font_size(@name).round(3)}">#{escape(@name)}</text>
        <text x="#{CENTER}" y="#{AMHARIC_Y}" text-anchor="middle" font-family="Noto Serif Ethiopic, serif" font-weight="700" font-size="#{AMHARIC_SIZE}">#{escape(@amharic)}</text>
        <line x1="#{RULE[:x1]}" y1="#{RULE[:y]}" x2="#{RULE[:x2]}" y2="#{RULE[:y]}" stroke="#{ink}" stroke-width="#{RULE[:width]}"/>
        <text x="#{CENTER}" y="#{DATE_Y}" text-anchor="middle" font-family="Geist Mono, monospace" font-size="#{DATE_SIZE}" letter-spacing="#{DATE_LETTER_SPACING}">#{escape(@date)}</text>
      </g>
    SVG
  end

  private
    def escape(text)
      ERB::Util.html_escape(text)
    end
end
