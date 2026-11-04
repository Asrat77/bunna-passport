# The pencil profile picture, ported line for line from the Mini App's
# web/src/design/doodle/generate.ts (itself a port of the design canvas) and
# its renderer, Doodle.tsx. The same seed and traits must draw the same face
# on the card as on the phone, so the tests check this against the canvas
# fixture and the editor fixture the web tests use.
#
# Paths are in a 100 × 100 viewBox.
class ShareCard::Doodle
  MOODS = %w[sleepy awake].freeze

  # The original six hair styles, by index. A cap or beanie hid the hair, so
  # those faces get a buzz cut under the hat if the hat comes off.
  SEED_HAIR = [
    { "hair" => "buzz", "hat" => "cap" },
    { "hair" => "afro", "hat" => "none" },
    { "hair" => "buzz", "hat" => "none" },
    { "hair" => "bald", "hat" => "none" },
    { "hair" => "buzz", "hat" => "beanie" },
    { "hair" => "side", "hat" => "none" }
  ].freeze
  SEED_EYES = %w[dot round almond].freeze
  SEED_NOSE = %w[point round curve].freeze

  # Streams of their own for parts the seed never drew (stubble or freckles
  # added in the editor), so turning one on doesn't move the other.
  STUBBLE_STREAM = 0x9E3779B9
  FRECKLE_STREAM = 0x85EBCA6B

  # How far above the crown the headphone band clears whatever is up there.
  BAND_LIFT = { "wrap" => 18, "beanie" => 16, "cap" => 9, "afro" => 15, "bun" => 15, "curls" => 10, "locs" => 8 }.freeze

  def self.paths(seed, mood, traits = {})
    new(seed, mood, traits).paths
  end

  def initialize(seed, mood, traits = {})
    raise ArgumentError, "unknown mood #{mood.inspect}" unless MOODS.include?(mood.to_s)

    @seed = seed.to_s
    @awake = mood.to_s == "awake"
    @overrides = Avatar.clean(traits)
  end

  def paths
    @paths ||= draw
  end

  GRAPHITE = "#3A3733".freeze
  BLUSH = "#C8664A".freeze
  ACCENT = "#D99A24".freeze
  ACCENT_SOFT = "#F7E8BF".freeze
  SUNKEN = "#EDE2D3".freeze
  BORDER_STRONG = "#B9A58E".freeze

  # An SVG fragment in the 100 viewBox, drawn the way Doodle.tsx draws a face
  # of 70px or more: wobbly paper fills, graphite lines with grain, hatched
  # hair, a faint second pass, blush when awake, and coloured pencil under
  # the lines for whatever the person picked. `id` keeps ids unique.
  def to_svg(id: "doodle")
    p = paths
    t = p[:traits]
    colors = Avatar::COLORS
    noise = (p[:hash] % 97) + 1
    o = ->(d) { d.empty? ? "M0 0" : d }
    disc = awake ? ACCENT_SOFT : SUNKEN
    ring = awake ? %(stroke="#{ACCENT}") : %(stroke="#{BORDER_STRONG}" stroke-dasharray="5 4.5")
    hatched = p[:mouthHatched] ? "url(##{id}-h)" : "none"

    skin = colors["skin"][t["skin"]]
    ink = colors["ink"][t["skin"]]
    hair_tint = colors["hair_color"][t["hair_color"]]
    top_tint = p[:topIsHat] ? colors["hat"][t["hat"]] : hair_tint
    tinted = ->(fill) { fill != "none" }
    hatch_opacity = ->(fill) { tinted.(fill) ? "0.35" : "1" }
    cross_opacity = ->(fill) { tinted.(fill) ? "0" : "0.8" }
    whites = t["skin"] == "paper" ? "" : p[:whites]
    optional = ->(show, svg) { show ? svg : "" }

    hair_back = optional.(p[:hairBack].present?, <<~SVG)
      <g filter="url(##{id}-w)">
        #{optional.(tinted.(hair_tint), %(<path d="#{p[:hairBack]}" fill="#{hair_tint}"/>))}
      </g>
      <g filter="url(##{id}-p)" fill="none" stroke="#{GRAPHITE}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">
        <path d="#{p[:hairBack]}" fill="url(##{id}-h)" fill-opacity="#{hatch_opacity.(hair_tint)}"/>
        <path d="#{p[:hairBack]}" fill="url(##{id}-x)" stroke="none" opacity="#{cross_opacity.(hair_tint)}"/>
      </g>
    SVG

    accessories = optional.((p[:lenses] + p[:headphonesCups] + p[:earringsFill] + p[:earringsLine]).present?, <<~SVG)
      <g filter="url(##{id}-w)">
        #{optional.(p[:lenses].present?, %(<path d="#{p[:lenses]}" fill="#{ink}"/>))}
        #{optional.(p[:headphonesCups].present?, %(<path d="#{p[:headphonesCups]}" fill="#{colors['headphones']}"/>))}
        #{optional.(p[:earringsFill].present?, %(<path d="#{p[:earringsFill]}" fill="#{colors['earrings']}"/>))}
      </g>
      <g filter="url(##{id}-p)" fill="none" stroke="#{ink}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        #{optional.(p[:lenses].present?, %(<path d="#{p[:lenses]}"/>))}
        #{optional.(p[:lensGlints].present?, %(<path d="#{p[:lensGlints]}" stroke="#{colors['eye_white']}" stroke-width="1.1" opacity="0.75"/>))}
        #{optional.(p[:headphonesBand].present?, %(<path d="#{p[:headphonesBand]}" stroke-width="4.8"/><path d="#{p[:headphonesBand]}" stroke="#{colors['headphones']}" stroke-width="3.2"/>))}
        #{optional.(p[:headphonesCups].present?, %(<path d="#{p[:headphonesCups]}"/>))}
        #{optional.(p[:earringsLine].present?, %(<path d="#{p[:earringsLine]}" stroke="#{colors['earrings']}" stroke-width="1.44"/>))}
      </g>
    SVG

    <<~SVG
      <defs>
        <filter id="#{id}-w" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="#{noise}" result="warp"/>
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.4" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        <filter id="#{id}-p" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="#{noise}" result="warp"/>
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="wobbly"/>
          <feTurbulence type="fractalNoise" baseFrequency="1.7" numOctaves="1" seed="3" result="grain"/>
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0.23 0 0 0 0 0.22 0 0 0 0 0.2 0 0 0 -2 1.6" result="grainAlpha"/>
          <feComposite in="wobbly" in2="grainAlpha" operator="in"/>
        </filter>
        <pattern id="#{id}-h" patternUnits="userSpaceOnUse" width="2.3" height="2.3" patternTransform="rotate(38)">
          <line x1="0.6" y1="0" x2="0.6" y2="2.3" stroke="#{GRAPHITE}" stroke-width="1.05"/>
        </pattern>
        <pattern id="#{id}-x" patternUnits="userSpaceOnUse" width="3.2" height="3.2" patternTransform="rotate(-48)">
          <line x1="0.6" y1="0" x2="0.6" y2="3.2" stroke="#{GRAPHITE}" stroke-width="0.8"/>
        </pattern>
      </defs>
      <circle cx="50" cy="50" r="50" fill="#{disc}"/>
      <circle cx="50" cy="50" r="48.7" fill="none" stroke-linecap="round" stroke-width="2.6" #{ring}/>
      #{hair_back}
      <g filter="url(##{id}-w)">
        <path d="#{o[p[:earsFill]]}" fill="#{skin}"/>
        <path d="#{p[:head]}" fill="#{skin}"/>
        #{optional.(tinted.(hair_tint) && p[:hairShade].present?, %(<path d="#{p[:hairShade]}" fill="#{hair_tint}" opacity="0.7"/>))}
        #{optional.(tinted.(top_tint) && p[:hairFill].present?, %(<path d="#{p[:hairFill]}" fill="#{top_tint}"/>))}
        #{optional.(tinted.(hair_tint) && p[:facialHair].present?, %(<path d="#{p[:facialHair]}" fill="#{hair_tint}"/>))}
        #{optional.(whites.present?, %(<path d="#{whites}" fill="#{colors['eye_white']}"/>))}
      </g>
      <g filter="url(##{id}-p)" fill="none" stroke="#{ink}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="#{o[p[:hairFill]]}" fill="url(##{id}-h)" fill-opacity="#{hatch_opacity.(top_tint)}" stroke-width="1.1"/>
        <path d="#{o[p[:hairFill]]}" fill="url(##{id}-x)" stroke="none" opacity="#{cross_opacity.(top_tint)}"/>
        <path d="#{p[:neck]}"/>
        <path d="#{o[p[:earsStroke]]}"/>
        <path d="#{p[:headStroke]}"/>
        <path d="#{o[p[:hairLine]]}"/>
        #{optional.(tinted.(hair_tint) && !p[:topIsHat] && p[:hairLine].present?, %(<path d="#{p[:hairLine]}" stroke="#{colors['eye_white']}" stroke-width="0.6" opacity="0.4" transform="translate(0.45 0.45)"/>))}
        #{optional.(p[:facialHair].present?, %(<path d="#{p[:facialHair]}" fill="url(##{id}-h)" fill-opacity="#{hatch_opacity.(hair_tint)}" stroke-width="1.1"/>))}
        <path d="#{p[:brows]}"/>
        <path d="#{o[p[:eyes]]}"/>
        <path d="#{o[p[:pupils]]}" fill="#{colors['eye_color'][t['eye_color']]}" stroke="none"/>
        #{optional.(p[:pupilCores].present?, %(<path d="#{p[:pupilCores]}" fill="#{ink}" stroke="none"/>))}
        <path d="#{p[:nose]}"/>
        <path d="#{p[:mouth]}" fill="#{hatched}"/>
        <path d="#{o[p[:glasses]]}"/>
        <path d="#{o[p[:dots]]}" fill="#{ink}" stroke="none"/>
        <path d="#{p[:extra]}" stroke-width="1.1"/>
      </g>
      <g filter="url(##{id}-p)" fill="none" stroke="#{ink}" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round" opacity="0.42" transform="translate(0.8 -0.6) rotate(-1.2 50 55)">
        <path d="#{p[:headStroke]}"/>
        <path d="#{p[:neck]}"/>
        <path d="#{o[p[:hairLine]]}"/>
        <path d="#{p[:brows]}"/>
        <path d="#{o[p[:eyes]]}"/>
        <path d="#{p[:nose]}"/>
        <path d="#{p[:mouthLine]}"/>
        <path d="#{o[p[:glasses]]}"/>
      </g>
      <g filter="url(##{id}-p)" fill="none" stroke="#{BLUSH}" stroke-width="1.1" stroke-linecap="round" opacity="0.6">
        <path d="#{o[p[:cheeks]]}"/>
      </g>
      #{accessories}
    SVG
  end

  private
    attr_reader :awake

    # One decimal, written the way JavaScript's String(Math.round(n * 10) / 10) does.
    def f(number)
      rounded = (number * 10 + 0.5).floor / 10.0
      rounded == rounded.floor ? rounded.floor.to_s : rounded.to_s
    end

    def circ(x, y, rad)
      "M#{f(x - rad)} #{f(y)}a#{f(rad)} #{f(rad)} 0 1 0 #{f(rad * 2)} 0a#{f(rad)} #{f(rad)} 0 1 0 #{f(-rad * 2)} 0Z"
    end

    # A rounded rectangle centred on (x, y).
    def round_rect(x, y, w, h, rad)
      "M#{f(x - w / 2.0 + rad)} #{f(y - h / 2.0)}h#{f(w - rad * 2)}q#{f(rad)} 0 #{f(rad)} #{f(rad)}v#{f(h - rad * 2)}q0 #{f(rad)} #{f(-rad)} #{f(rad)}h#{f(-(w - rad * 2))}q#{f(-rad)} 0 #{f(-rad)} #{f(-rad)}v#{f(-(h - rad * 2))}q0 #{f(-rad)} #{f(rad)} #{f(-rad)}Z"
    end

    def mid(p, q)
      [ (p[0] + q[0]) / 2.0, (p[1] + q[1]) / 2.0 ]
    end

    def r(a, b)
      a + (b - a) * @rnd.call
    end

    def ri(n)
      (@rnd.call * n).floor
    end

    def seed_traits(hair_style, eye_style, nose_style, has_glasses, has_stubble, has_freckles)
      {
        "skin" => "paper",
        **SEED_HAIR[hair_style],
        "hair_color" => "graphite",
        "eyes" => SEED_EYES[eye_style],
        "eye_color" => "graphite",
        "nose" => SEED_NOSE[nose_style],
        "facial_hair" => has_stubble ? "stubble" : "none",
        "freckles" => has_freckles ? "freckles" : "none",
        "glasses" => has_glasses ? "round" : "none",
        "headphones" => "none",
        "earrings" => "none"
      }
    end

    def draw
      hash = ShareCard::Seed.fnv1a(@seed)
      @rnd = ShareCard::Seed.mulberry32(hash)
      stubble_rnd = ShareCard::Seed.mulberry32((hash ^ STUBBLE_STREAM) & ShareCard::Seed::MASK)
      freckle_rnd = ShareCard::Seed.mulberry32((hash ^ FRECKLE_STREAM) & ShareCard::Seed::MASK)

      cx = 50 + r(-1.5, 1.5)
      cy = 55
      rx = r(23, 28)
      ry = r(27, 31)
      chin = r(0.8, 0.98)
      n = 12
      pts = (0...n).map do |k|
        a = (Math::PI * 2 * k) / n - Math::PI / 2
        j = r(0.95, 1.05)
        sx = Math.sin(a) > 0.3 ? chin : 1
        [ cx + Math.cos(a) * rx * j * sx, cy + Math.sin(a) * ry * j ]
      end
      m0 = mid(pts[n - 1], pts[0])
      outline = +"M#{f(m0[0])} #{f(m0[1])}"
      n.times do |k|
        p = pts[k]
        m = mid(p, pts[(k + 1) % n])
        outline << "Q#{f(p[0])} #{f(p[1])} #{f(m[0])} #{f(m[1])}"
      end
      head = "#{outline}Z"
      # A pencil outline runs past where it started instead of closing neatly.
      m1 = mid(pts[0], pts[1])
      head_stroke = "#{outline}Q#{f(pts[0][0] + 0.4)} #{f(pts[0][1] - 1.3)} #{f(m1[0] + 0.8)} #{f(m1[1] - 1.1)}"

      left = cx - rx
      right = cx + rx
      top = cy - ry
      ey = cy - ry * 0.02 + r(-1.5, 1.5)
      hl = cy - ry * 0.32

      has_ears = @rnd.call < 0.75
      ear_l = "M#{f(left + 1)} #{f(ey - 4)}c-7 -3 -8 11 0 10"
      ear_r = "M#{f(right - 1)} #{f(ey - 4)}c7 -3 8 11 0 10"
      ears_fill = has_ears ? "#{ear_l}Z#{ear_r}Z" : ""
      ears_stroke = has_ears ? "#{ear_l}#{ear_r}M#{f(left - 2.5)} #{f(ey - 1)}q-1.5 2.5 0.5 4.5M#{f(right + 2.5)} #{f(ey - 1)}q1.5 2.5 -0.5 4.5" : ""

      hair_style = ri(6)
      eye_style = ri(3)
      es = r(9, 11.5)
      gaze = r(-1.4, 1.4)
      ex1 = cx - es
      ex2 = cx + es
      brow_lift = r(-1, 1.5)
      nose_style = ri(3)
      nx = cx + r(-1, 3)
      my = cy + ry * 0.5 + r(-1, 1.5)
      mw = r(6.5, 10)
      open_mouth = @rnd.call < 0.5
      has_glasses = @rnd.call < 0.28
      has_stubble = @rnd.call < 0.3
      has_freckles = @rnd.call < 0.25

      t = seed_traits(hair_style, eye_style, nose_style, has_glasses, has_stubble, has_freckles).merge(@overrides)

      # Hair first, then the hat that replaces whatever is on top. Hair behind
      # the head (long hair, locs) still shows under a hat.
      hair_fill = +""
      hair_line = +""
      hair_back = +""
      hair_shade = +""
      top_is_hat = t["hat"] != "none"
      case t["hair"]
      when "afro"
        bumps = 9
        d = +"M#{f(left - 2)} #{f(cy - ry * 0.1)}"
        (0..bumps).each do |b|
          a = Math::PI + (Math::PI * b) / bumps
          x = cx + Math.cos(a) * (rx + 7)
          y = cy - ry * 0.25 + Math.sin(a) * (ry + 2)
          d << "A6 6 0 0 1 #{f(x)} #{f(y)}"
        end
        d << "L#{f(right + 2)} #{f(cy - ry * 0.1)}Q#{f(right - 3)} #{f(hl - 6)} #{f(cx)} #{f(hl - 5)}Q#{f(left + 3)} #{f(hl - 6)} #{f(left - 2)} #{f(cy - ry * 0.1)}Z"
        hair_fill = d
      when "buzz"
        15.times do |b|
          a = Math::PI * 1.1 + (Math::PI * 0.8 * b) / 14
          hair_line << "M#{f(cx + Math.cos(a) * rx * 0.99)} #{f(cy + Math.sin(a) * ry * 0.99)}L#{f(cx + Math.cos(a + 0.05) * rx * 0.8)} #{f(cy + Math.sin(a + 0.05) * ry * 0.8 + 1)}"
        end
        hair_shade = "M#{f(left + 1)} #{f(hl + 3)}Q#{f(left - 0.5)} #{f(top - 0.5)} #{f(cx)} #{f(top - 0.8)}Q#{f(right + 0.5)} #{f(top - 0.5)} #{f(right - 1)} #{f(hl + 3)}Q#{f(cx)} #{f(hl - 3)} #{f(left + 1)} #{f(hl + 3)}Z"
      when "bald"
        hair_line = "M#{f(cx - 9)} #{f(top + 6)}q5 -3 10 -1"
      when "side"
        hair_fill = "M#{f(left)} #{f(cy - ry * 0.12)}Q#{f(left - 3)} #{f(top - 3)} #{f(cx - 2)} #{f(top - 4)}Q#{f(right + 2)} #{f(top - 3)} #{f(right + 1)} #{f(cy - ry * 0.25)}Q#{f(cx + 8)} #{f(hl - 8)} #{f(cx - 5)} #{f(hl - 3)}Q#{f(left + 4)} #{f(hl)} #{f(left)} #{f(cy - ry * 0.12)}Z"
      when "curls"
        bumps = 10
        d = +"M#{f(left - 1)} #{f(cy - ry * 0.2)}"
        (0..bumps).each do |b|
          a = Math::PI + (Math::PI * b) / bumps
          x = cx + Math.cos(a) * (rx + 2.5)
          y = cy - ry * 0.18 + Math.sin(a) * (ry * 0.92 + 3)
          d << "A3.6 3.6 0 0 1 #{f(x)} #{f(y)}"
        end
        d << "L#{f(right + 1)} #{f(cy - ry * 0.2)}Q#{f(right - 4)} #{f(hl - 4)} #{f(cx)} #{f(hl - 3)}Q#{f(left + 4)} #{f(hl - 4)} #{f(left - 1)} #{f(cy - ry * 0.2)}Z"
        hair_fill = d
      when "cornrows"
        hair_fill = "M#{f(left + 0.5)} #{f(hl + 2)}Q#{f(left - 1.5)} #{f(top - 2)} #{f(cx)} #{f(top - 2.5)}Q#{f(right + 1.5)} #{f(top - 2)} #{f(right - 0.5)} #{f(hl + 2)}Q#{f(cx)} #{f(hl - 5)} #{f(left + 0.5)} #{f(hl + 2)}Z"
        (-2..2).each do |k|
          x0 = cx + k * 6.5
          y0 = hl - 3.5 + k.abs * 1.6
          x1 = cx + k * 8.5
          y1 = top - 1 + k.abs * 2.5
          hair_line << "M#{f(x0)} #{f(y0)}L#{f(x1)} #{f(y1)}"
          (1..3).each do |s|
            px = x0 + ((x1 - x0) * s) / 4
            py = y0 + ((y1 - y0) * s) / 4
            hair_line << "M#{f(px - 1.6)} #{f(py + 1)}L#{f(px)} #{f(py - 0.6)}L#{f(px + 1.6)} #{f(py + 1)}"
          end
        end
      when "bun"
        hair_fill = "M#{f(left)} #{f(cy - ry * 0.15)}Q#{f(left - 3)} #{f(top - 3)} #{f(cx)} #{f(top - 4)}Q#{f(right + 3)} #{f(top - 3)} #{f(right)} #{f(cy - ry * 0.15)}Q#{f(right - 3)} #{f(hl - 6)} #{f(cx)} #{f(hl - 5)}Q#{f(left + 3)} #{f(hl - 6)} #{f(left)} #{f(cy - ry * 0.15)}Z#{circ(cx, top - 9, 7)}"
        hair_line = "M#{f(cx - 6)} #{f(top - 3.5)}q6 2.5 12 0"
      when "long"
        hair_fill = "M#{f(left - 0.5)} #{f(cy - ry * 0.05)}Q#{f(left - 3)} #{f(top - 3)} #{f(cx)} #{f(top - 3.5)}Q#{f(right + 3)} #{f(top - 3)} #{f(right + 0.5)} #{f(cy - ry * 0.05)}Q#{f(right - 2)} #{f(hl - 2)} #{f(cx + 1)} #{f(hl - 6)}Q#{f(left + 2)} #{f(hl - 2)} #{f(left - 0.5)} #{f(cy - ry * 0.05)}Z"
        hair_back = "M#{f(cx)} #{f(top - 3)}C#{f(left - 10)} #{f(top - 3)} #{f(left - 9)} #{f(cy + 6)} #{f(left - 8)} #{f(cy + ry * 0.95)}Q#{f(left - 2)} #{f(cy + ry + 3)} #{f(cx)} #{f(cy + ry * 0.6)}Q#{f(right + 2)} #{f(cy + ry + 3)} #{f(right + 8)} #{f(cy + ry * 0.95)}C#{f(right + 9)} #{f(cy + 6)} #{f(right + 10)} #{f(top - 3)} #{f(cx)} #{f(top - 3)}Z"
      else
        # Locs: a full crown and rounded strands hanging behind.
        hair_fill = "M#{f(left - 2)} #{f(cy - ry * 0.05)}Q#{f(left - 4)} #{f(top - 4)} #{f(cx)} #{f(top - 5)}Q#{f(right + 4)} #{f(top - 4)} #{f(right + 2)} #{f(cy - ry * 0.05)}L#{f(right - 1)} #{f(hl)}Q#{f(cx)} #{f(hl - 8)} #{f(left + 1)} #{f(hl)}Z"
        (-2..2).each do |k|
          x = cx + k * 6
          hair_line << "M#{f(x)} #{f(hl - 5 + k.abs)}Q#{f(x + k * 0.8)} #{f(top + 2)} #{f(x + k * 1.6)} #{f(top - 3 + k.abs * 1.5)}"
        end
        strand = ->(x, y_top, y_end) { "M#{f(x - 2.6)} #{f(y_top)}L#{f(x - 2.6)} #{f(y_end)}a2.6 2.6 0 0 0 5.2 0L#{f(x + 2.6)} #{f(y_top)}Z" }
        y_top = cy - ry * 0.3
        hair_back = strand.(left - 5.5, y_top, cy + ry * 0.7) + strand.(left - 0.5, y_top, cy + ry * 0.88) +
          strand.(right + 0.5, y_top, cy + ry * 0.88) + strand.(right + 5.5, y_top, cy + ry * 0.7)
      end

      hair_shade = "" if top_is_hat
      case t["hat"]
      when "cap"
        hair_fill = "M#{f(left - 1)} #{f(hl)}Q#{f(left - 1)} #{f(top - 5)} #{f(cx)} #{f(top - 6)}Q#{f(right + 2)} #{f(top - 5)} #{f(right + 2)} #{f(hl - 1)}Q#{f(cx)} #{f(hl - 7)} #{f(left - 1)} #{f(hl)}Z"
        hair_line = "M#{f(right - 4)} #{f(hl - 1)}q9 -1 13 4"
      when "beanie"
        band = cy - ry * 0.38
        hair_fill = "M#{f(left - 2)} #{f(band)}Q#{f(left - 3)} #{f(top - 9)} #{f(cx)} #{f(top - 10)}Q#{f(right + 3)} #{f(top - 9)} #{f(right + 2)} #{f(band)}Z#{circ(cx, top - 12, 4.5)}"
        hair_line = "M#{f(left - 3)} #{f(band)}L#{f(right + 3)} #{f(band)}L#{f(right + 3)} #{f(band + 6)}L#{f(left - 3)} #{f(band + 6)}Z"
      when "wrap"
        hair_fill = "M#{f(left - 2.5)} #{f(hl + 1)}Q#{f(left - 5)} #{f(top - 14)} #{f(cx - 2)} #{f(top - 13)}Q#{f(right + 5)} #{f(top - 13)} #{f(right + 2.5)} #{f(hl + 1)}Q#{f(cx)} #{f(hl - 6)} #{f(left - 2.5)} #{f(hl + 1)}Z" \
          "M#{f(cx - 1)} #{f(top - 9)}q-9 -9 -1.5 -12.5q4 3.5 1.5 12.5ZM#{f(cx + 1)} #{f(top - 9)}q9 -8 2 -12.5q-4.5 3.5 -2 12.5Z"
        hair_line = "M#{f(left - 1)} #{f(hl - 3)}Q#{f(cx)} #{f(hl - 13)} #{f(right + 1)} #{f(hl - 3)}M#{f(left + 1)} #{f(hl - 10)}Q#{f(cx)} #{f(hl - 20)} #{f(right - 1)} #{f(hl - 10)}"
      end

      # Stubble and freckles keep their seed's own positions when the seed drew
      # them, and come from their own streams when added in the editor.
      dots = +""
      if has_stubble || t["facial_hair"] == "stubble"
        draw = has_stubble ? @rnd : stubble_rnd
        stubble = +""
        14.times do |k|
          a = Math::PI * (0.15 + 0.7 * (k / 13.0))
          rr = 0.72 + (0.9 - 0.72) * draw.call
          stubble << circ(cx + Math.cos(a) * rx * chin * rr, cy + Math.sin(a) * ry * rr, 0.5)
        end
        dots << stubble if t["facial_hair"] == "stubble"
      end
      if has_freckles || t["freckles"] == "freckles"
        draw = has_freckles ? @rnd : freckle_rnd
        d = ->(a, b) { a + (b - a) * draw.call }
        freckles = +""
        3.times do
          freckles << circ(ex1 + d.(-3, 3), ey + 7 + d.(0, 2), 0.55) + circ(ex2 + d.(-3, 3), ey + 7 + d.(0, 2), 0.55)
        end
        dots << freckles if t["freckles"] == "freckles"
      end

      nl = cx - rx * chin * 0.36
      nr = cx + rx * chin * 0.36
      ny = cy + ry * 0.9
      neck = "M#{f(nl)} #{f(ny)}q-0.6 6 -1.8 12M#{f(nr)} #{f(ny)}q0.4 6 1.6 12"

      nose =
        case t["nose"]
        when "point" then "M#{f(nx)} #{f(ey + 3)}l-3.5 9.5l4.5 0.5"
        when "round" then "M#{f(nx - 2)} #{f(ey + 5)}q-4.5 8 1.5 9q4 0.3 3 -3"
        else "M#{f(nx)} #{f(ey + 3)}q3.5 6 -1.5 10.5"
        end

      # Frames sit across the eyes and reach back to the ears.
      temples = ->(half) { "M#{f(ex1 - half)} #{f(ey - 1)}L#{f(left + 1)} #{f(ey - 3)}M#{f(ex2 + half)} #{f(ey - 1)}L#{f(right - 1)} #{f(ey - 3)}" }
      glasses = +""
      lenses = +""
      lens_glints = +""
      case t["glasses"]
      when "round"
        glasses = "#{circ(ex1, ey, 6.6)}#{circ(ex2, ey, 6.6)}M#{f(ex1 + 6.6)} #{f(ey - 1)}Q#{f(cx)} #{f(ey - 3.5)} #{f(ex2 - 6.6)} #{f(ey - 1)}#{temples.(6.6)}"
      when "square"
        glasses = "#{round_rect(ex1, ey, 13, 10.5, 2.4)}#{round_rect(ex2, ey, 13, 10.5, 2.4)}M#{f(ex1 + 6.5)} #{f(ey - 1.5)}Q#{f(cx)} #{f(ey - 3.5)} #{f(ex2 - 6.5)} #{f(ey - 1.5)}#{temples.(6.5)}"
      when "shades"
        lens = ->(x) { "M#{f(x - 7)} #{f(ey - 4)}Q#{f(x)} #{f(ey - 5.5)} #{f(x + 7)} #{f(ey - 4)}Q#{f(x + 6.5)} #{f(ey + 6)} #{f(x)} #{f(ey + 5.5)}Q#{f(x - 6.5)} #{f(ey + 6)} #{f(x - 7)} #{f(ey - 4)}Z" }
        lenses = lens.(ex1) + lens.(ex2)
        lens_glints = "M#{f(ex1 - 4)} #{f(ey - 1)}l2.6 -1.6M#{f(ex2 - 4)} #{f(ey - 1)}l2.6 -1.6"
        glasses = "#{lenses}M#{f(ex1 + 7)} #{f(ey - 3.5)}Q#{f(cx)} #{f(ey - 5.5)} #{f(ex2 - 7)} #{f(ey - 3.5)}#{temples.(7)}"
      end

      # Mood only changes eyes, brows, mouth, cheeks and the marks beside the head.
      eyes = +""
      pupils = +""
      whites = +""
      brows = +""
      pupil_cores = +""
      coloured = t["eye_color"] != "graphite"
      iris = lambda do |x, y, rad|
        pupils << circ(x, y, rad)
        pupil_cores << circ(x, y, rad * 0.5) if coloured
      end
      [ ex1, ex2 ].each_with_index do |ex, i|
        left_eye = i.zero?
        if awake
          case t["eyes"]
          when "dot"
            # A coloured dot needs a white around it to read on deeper skin.
            whites << circ(ex, ey, 3.4) if coloured
            iris.(ex, ey, coloured ? 2.3 : 2.1)
          when "round"
            white = circ(ex, ey, 4.6)
            eyes << white
            whites << white
            iris.(ex + gaze, ey + 0.5, coloured ? 2.3 : 1.8)
          else
            white = "M#{f(ex - 3.2)} #{f(ey)}a3.2 4.3 0 1 0 6.4 0a3.2 4.3 0 1 0 -6.4 0Z"
            eyes << white
            whites << white
            iris.(ex + gaze * 0.7, ey + 1, coloured ? 2 : 1.5)
          end
          brows << "M#{f(ex - 4.5)} #{f(ey - 8.5 - brow_lift)}q4.5 -3.5 9 0"
        else
          if t["eyes"] == "dot"
            eyes << "M#{f(ex - 3.5)} #{f(ey)}q3.5 2.5 7 0"
          else
            eyes << "M#{f(ex - 4.6)} #{f(ey)}a4.6 4.6 0 0 0 9.2 0"
            whites << "M#{f(ex - 4.6)} #{f(ey)}a4.6 4.6 0 0 0 9.2 0Z"
            eyes << "M#{f(ex - 5.2)} #{f(ey)}h10.4"
            iris.(ex, ey + 2.4, coloured ? 1.6 : 1.2)
          end
          eyes << "M#{f(ex - 3.5)} #{f(ey + 6.5)}q3.5 2 7 0"
          brows << "M#{f(ex - 4.5)} #{f(ey - (left_eye ? 6 : 7.5))}L#{f(ex + 4.5)} #{f(ey - (left_eye ? 7.5 : 6))}"
        end
      end

      mouth_hatched = false
      if awake
        mouth_line = "M#{f(cx - mw)} #{f(my - 1)}Q#{f(cx)} #{f(my + 7)} #{f(cx + mw)} #{f(my - 1.5)}"
        mouth = mouth_line
        if open_mouth
          mouth += "Z"
          mouth_line += "L#{f(cx - mw)} #{f(my - 1)}"
          mouth_hatched = true
        end
      elsif open_mouth
        mouth = "M#{f(cx - 3)} #{f(my + 1)}a3 4 0 1 0 6 0a3 4 0 1 0 -6 0Z"
        mouth_line = mouth
        mouth_hatched = true
      else
        mouth = "M#{f(cx - mw * 0.7)} #{f(my + 1.5)}q#{f(mw * 0.35)} -2 #{f(mw * 0.7)} 0t#{f(mw * 0.7)} 0"
        mouth_line = mouth
      end

      # Facial hair. The beard follows the jaw from cheek to cheek and leaves the
      # mouth clear; both styles carry a mustache.
      mustache = "M#{f(cx - mw * 0.75)} #{f(my - 2.4)}Q#{f(cx - mw * 0.4)} #{f(my - 5.6)} #{f(cx)} #{f(my - 4.3)}Q#{f(cx + mw * 0.4)} #{f(my - 5.6)} #{f(cx + mw * 0.75)} #{f(my - 2.4)}Q#{f(cx + mw * 0.4)} #{f(my - 3.4)} #{f(cx)} #{f(my - 2.6)}Q#{f(cx - mw * 0.4)} #{f(my - 3.4)} #{f(cx - mw * 0.75)} #{f(my - 2.4)}Z"
      facial_hair =
        case t["facial_hair"]
        when "mustache" then mustache
        when "beard"
          g = pts.map { |p| [ cx + (p[0] - cx) * 1.04, cy + (p[1] - cy) * 1.05 + 0.6 ] }
          start = mid(g[3], g[4])
          d = +"M#{f(start[0])} #{f(start[1])}"
          (4..8).each do |k|
            m = mid(g[k], g[k + 1])
            d << "Q#{f(g[k][0])} #{f(g[k][1])} #{f(m[0])} #{f(m[1])}"
          end
          d << "Q#{f(cx - mw - 2)} #{f(my - 2)} #{f(cx - mw - 1.5)} #{f(my + 1)}Q#{f(cx)} #{f(my + 12)} #{f(cx + mw + 1.5)} #{f(my + 1)}Q#{f(cx + mw + 2)} #{f(my - 2)} #{f(start[0])} #{f(start[1])}Z"
          d + mustache
        else ""
        end

      # Headphones: a band over whatever is on the head, cups over the ears.
      headphones_band = ""
      headphones_cups = ""
      if t["headphones"] == "headphones"
        tall = (top_is_hat ? BAND_LIFT[t["hat"]] : BAND_LIFT[t["hair"]]) || 6
        y0 = ey - 6
        apex = top - tall
        c = y0 - (y0 - apex) / 0.75
        headphones_band = "M#{f(left - 3)} #{f(y0)}C#{f(left - 4)} #{f(c)} #{f(right + 4)} #{f(c)} #{f(right + 3)} #{f(y0)}"
        headphones_cups = round_rect(left - 3, ey + 0.5, 7.5, 14, 3) + round_rect(right + 3, ey + 0.5, 7.5, 14, 3)
      end

      # Earrings hang from the lobes, or from where the lobes would be.
      lobe_l = [ has_ears ? left - 1.5 : left + 0.8, ey + 7 ]
      lobe_r = [ has_ears ? right + 1.5 : right - 0.8, ey + 7 ]
      earrings_fill = t["earrings"] == "studs" ? circ(*lobe_l, 1.4) + circ(*lobe_r, 1.4) : ""
      earrings_line = t["earrings"] == "hoops" ? circ(lobe_l[0], lobe_l[1] + 2.6, 2.8) + circ(lobe_r[0], lobe_r[1] + 2.6, 2.8) : ""

      extra =
        if awake
          "M#{f(right + 4)} #{f(top + 10)}l6 -3M#{f(right + 5)} #{f(top + 17)}l6.5 0.5M#{f(right + 1)} #{f(top + 3)}l3.5 -5"
        else
          "M#{f(right + 2)} #{f(top + 2)}h6l-6 6h6M#{f(right + 11)} #{f(top - 7)}h4l-4 4h4"
        end

      # Colored-pencil blush once the coffee kicks in.
      cheeks = +""
      if awake
        [ ex1 - 2, ex2 + 2 ].each do |x|
          y = ey + 9
          cheeks << "M#{f(x - 3.5)} #{f(y + 1.5)}l3 -3M#{f(x - 2)} #{f(y + 3)}l4 -4M#{f(x)} #{f(y + 3.5)}l3 -3"
        end
      end

      {
        hash: hash,
        traits: t,
        hairBack: hair_back,
        earsFill: ears_fill,
        earsStroke: ears_stroke,
        head: head,
        headStroke: head_stroke,
        neck: neck,
        hairFill: hair_fill,
        hairLine: hair_line,
        hairShade: hair_shade,
        topIsHat: top_is_hat,
        brows: brows,
        whites: whites,
        eyes: eyes,
        pupils: pupils,
        pupilCores: pupil_cores,
        nose: nose,
        mouth: mouth,
        mouthLine: mouth_line,
        mouthHatched: mouth_hatched,
        facialHair: facial_hair,
        glasses: glasses,
        lenses: lenses,
        lensGlints: lens_glints,
        dots: dots,
        headphonesBand: headphones_band,
        headphonesCups: headphones_cups,
        earringsFill: earrings_fill,
        earringsLine: earrings_line,
        extra: extra,
        cheeks: cheeks
      }
    end
end
