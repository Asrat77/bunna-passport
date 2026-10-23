# The pencil doodle avatar, ported line for line from the Mini App's
# web/src/design/doodle/generate.ts (itself a port of the design canvas). The
# same seed must draw the same face on the card as on the phone, so the test
# checks this against the canvas fixture the web tests use.
#
# Paths are in a 100 × 100 viewBox.
class ShareCard::Doodle
  MOODS = %w[sleepy awake].freeze

  def self.paths(seed, mood)
    new(seed, mood).paths
  end

  def initialize(seed, mood)
    raise ArgumentError, "unknown mood #{mood.inspect}" unless MOODS.include?(mood.to_s)

    @seed = seed.to_s
    @awake = mood.to_s == "awake"
  end

  def paths
    @paths ||= draw
  end

  GRAPHITE = "#3A3733".freeze
  PAPER = "#F8F4EC".freeze
  BLUSH = "#C8664A".freeze
  ACCENT = "#D99A24".freeze
  ACCENT_SOFT = "#F7E8BF".freeze
  SUNKEN = "#EDE2D3".freeze
  BORDER_STRONG = "#B9A58E".freeze

  # An SVG fragment in the 100 viewBox, drawn the way Doodle.tsx draws a face
  # of 70px or more: wobbly paper fills, graphite lines with grain, hatched
  # hair, a faint second pass, and blush when awake. `id` keeps ids unique.
  def to_svg(id: "doodle")
    p = paths
    noise = (p[:hash] % 97) + 1
    o = ->(d) { d.empty? ? "M0 0" : d }
    disc = awake ? ACCENT_SOFT : SUNKEN
    ring = awake ? %(stroke="#{ACCENT}") : %(stroke="#{BORDER_STRONG}" stroke-dasharray="5 4.5")
    hatched = p[:mouthHatched] ? "url(##{id}-h)" : "none"

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
      <g filter="url(##{id}-w)">
        <path d="#{o[p[:earsFill]]}" fill="#{PAPER}"/>
        <path d="#{p[:head]}" fill="#{PAPER}"/>
      </g>
      <g filter="url(##{id}-p)" fill="none" stroke="#{GRAPHITE}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="#{o[p[:hairFill]]}" fill="url(##{id}-h)" stroke-width="1.1"/>
        <path d="#{o[p[:hairFill]]}" fill="url(##{id}-x)" stroke="none" opacity="0.8"/>
        <path d="#{p[:neck]}"/>
        <path d="#{o[p[:earsStroke]]}"/>
        <path d="#{p[:headStroke]}"/>
        <path d="#{o[p[:hairLine]]}"/>
        <path d="#{p[:brows]}"/>
        <path d="#{o[p[:eyes]]}"/>
        <path d="#{o[p[:pupils]]}" fill="#{GRAPHITE}" stroke="none"/>
        <path d="#{p[:nose]}"/>
        <path d="#{p[:mouth]}" fill="#{hatched}"/>
        <path d="#{o[p[:glasses]]}"/>
        <path d="#{o[p[:dots]]}" fill="#{GRAPHITE}" stroke="none"/>
        <path d="#{p[:extra]}" stroke-width="1.1"/>
      </g>
      <g filter="url(##{id}-p)" fill="none" stroke="#{GRAPHITE}" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round" opacity="0.42" transform="translate(0.8 -0.6) rotate(-1.2 50 55)">
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

    def mid(p, q)
      [ (p[0] + q[0]) / 2.0, (p[1] + q[1]) / 2.0 ]
    end

    def r(a, b)
      a + (b - a) * @rnd.call
    end

    def ri(n)
      (@rnd.call * n).floor
    end

    def draw
      hash = ShareCard::Seed.fnv1a(@seed)
      @rnd = ShareCard::Seed.mulberry32(hash)

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

      hair_fill = +""
      hair_line = +""
      case ri(6)
      when 0
        # Flat cap with a short brim.
        hair_fill = "M#{f(left - 1)} #{f(hl)}Q#{f(left - 1)} #{f(top - 5)} #{f(cx)} #{f(top - 6)}Q#{f(right + 2)} #{f(top - 5)} #{f(right + 2)} #{f(hl - 1)}Q#{f(cx)} #{f(hl - 7)} #{f(left - 1)} #{f(hl)}Z"
        hair_line = "M#{f(right - 4)} #{f(hl - 1)}q9 -1 13 4"
      when 1
        # Afro: bumps along an arc above the head.
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
      when 2
        # Buzz cut: short hatching.
        15.times do |b|
          a = Math::PI * 1.1 + (Math::PI * 0.8 * b) / 14
          hair_line << "M#{f(cx + Math.cos(a) * rx * 0.99)} #{f(cy + Math.sin(a) * ry * 0.99)}L#{f(cx + Math.cos(a + 0.05) * rx * 0.8)} #{f(cy + Math.sin(a + 0.05) * ry * 0.8 + 1)}"
        end
      when 3
        # Bald, with a shine.
        hair_line = "M#{f(cx - 9)} #{f(top + 6)}q5 -3 10 -1"
      when 4
        # Beanie with a cuff and pompom.
        band = cy - ry * 0.38
        hair_fill = "M#{f(left - 2)} #{f(band)}Q#{f(left - 3)} #{f(top - 9)} #{f(cx)} #{f(top - 10)}Q#{f(right + 3)} #{f(top - 9)} #{f(right + 2)} #{f(band)}Z#{circ(cx, top - 12, 4.5)}"
        hair_line = "M#{f(left - 3)} #{f(band)}L#{f(right + 3)} #{f(band)}L#{f(right + 3)} #{f(band + 6)}L#{f(left - 3)} #{f(band + 6)}Z"
      else
        # Side part.
        hair_fill = "M#{f(left)} #{f(cy - ry * 0.12)}Q#{f(left - 3)} #{f(top - 3)} #{f(cx - 2)} #{f(top - 4)}Q#{f(right + 2)} #{f(top - 3)} #{f(right + 1)} #{f(cy - ry * 0.25)}Q#{f(cx + 8)} #{f(hl - 8)} #{f(cx - 5)} #{f(hl - 3)}Q#{f(left + 4)} #{f(hl)} #{f(left)} #{f(cy - ry * 0.12)}Z"
      end

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

      dots = +""
      if has_stubble
        14.times do |k|
          a = Math::PI * (0.15 + 0.7 * (k / 13.0))
          rr = r(0.72, 0.9)
          dots << circ(cx + Math.cos(a) * rx * chin * rr, cy + Math.sin(a) * ry * rr, 0.5)
        end
      end
      if has_freckles
        3.times do
          dots << circ(ex1 + r(-3, 3), ey + 7 + r(0, 2), 0.55) + circ(ex2 + r(-3, 3), ey + 7 + r(0, 2), 0.55)
        end
      end

      nl = cx - rx * chin * 0.36
      nr = cx + rx * chin * 0.36
      ny = cy + ry * 0.9
      neck = "M#{f(nl)} #{f(ny)}q-0.6 6 -1.8 12M#{f(nr)} #{f(ny)}q0.4 6 1.6 12"

      nose =
        case nose_style
        when 0 then "M#{f(nx)} #{f(ey + 3)}l-3.5 9.5l4.5 0.5"
        when 1 then "M#{f(nx - 2)} #{f(ey + 5)}q-4.5 8 1.5 9q4 0.3 3 -3"
        else "M#{f(nx)} #{f(ey + 3)}q3.5 6 -1.5 10.5"
        end

      glasses = has_glasses ? "#{circ(ex1, ey, 6.6)}#{circ(ex2, ey, 6.6)}M#{f(ex1 + 6.6)} #{f(ey - 1)}Q#{f(cx)} #{f(ey - 3.5)} #{f(ex2 - 6.6)} #{f(ey - 1)}M#{f(ex1 - 6.6)} #{f(ey - 1)}L#{f(left + 1)} #{f(ey - 3)}M#{f(ex2 + 6.6)} #{f(ey - 1)}L#{f(right - 1)} #{f(ey - 3)}" : ""

      # Mood only changes eyes, brows, mouth, cheeks and the marks beside the head.
      eyes = +""
      pupils = +""
      brows = +""
      [ ex1, ex2 ].each_with_index do |ex, i|
        left_eye = i.zero?
        if awake
          case eye_style
          when 0
            pupils << circ(ex, ey, 2.1)
          when 1
            eyes << circ(ex, ey, 4.6)
            pupils << circ(ex + gaze, ey + 0.5, 1.8)
          else
            eyes << "M#{f(ex - 3.2)} #{f(ey)}a3.2 4.3 0 1 0 6.4 0a3.2 4.3 0 1 0 -6.4 0Z"
            pupils << circ(ex + gaze * 0.7, ey + 1, 1.5)
          end
          brows << "M#{f(ex - 4.5)} #{f(ey - 8.5 - brow_lift)}q4.5 -3.5 9 0"
        else
          if eye_style.zero?
            eyes << "M#{f(ex - 3.5)} #{f(ey)}q3.5 2.5 7 0"
          else
            eyes << "M#{f(ex - 4.6)} #{f(ey)}a4.6 4.6 0 0 0 9.2 0"
            eyes << "M#{f(ex - 5.2)} #{f(ey)}h10.4"
            pupils << circ(ex, ey + 2.4, 1.2)
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
        earsFill: ears_fill,
        earsStroke: ears_stroke,
        head: head,
        headStroke: head_stroke,
        neck: neck,
        hairFill: hair_fill,
        hairLine: hair_line,
        brows: brows,
        eyes: eyes,
        pupils: pupils,
        nose: nose,
        mouth: mouth,
        mouthLine: mouth_line,
        mouthHatched: mouth_hatched,
        glasses: glasses,
        dots: dots,
        extra: extra,
        cheeks: cheeks
      }
    end
end
