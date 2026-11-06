# The picture on a friend invite sent to a Telegram chat: the sender's
# profile picture on passport paper, "@handle invited you for coffee", a
# welcome stamp, and the wordmark. It's what makes the invite look like an
# invite from an app rather than a bare link. Drawn like ShareCard, with
# rsvg-convert and the same fonts and paper.
class InviteCard
  # Bump when the layout changes, so cached cards are drawn again.
  VERSION = 1

  WIDTH = 1080
  HEIGHT = 1080

  PAPER = ShareCard::PAPER
  RAISED = ShareCard::RAISED
  BORDER = ShareCard::BORDER
  INK = ShareCard::INK
  MUTED = ShareCard::MUTED
  CLAY = "#872F1D".freeze

  attr_reader :user

  def initialize(user)
    @user = user
  end

  # Rendering takes a moment, so keep the PNG until the person changes their
  # picture or handle.
  def self.png_for(user)
    key = [ "invite_card", VERSION, user.id, user.handle, user.avatar_digest ]
    Rails.cache.fetch(key, expires_in: 30.days) { new(user).to_png }
  end

  def to_svg
    <<~SVG
      <svg xmlns="http://www.w3.org/2000/svg" width="#{WIDTH}" height="#{HEIGHT}" viewBox="0 0 #{WIDTH} #{HEIGHT}">
        <rect width="#{WIDTH}" height="#{HEIGHT}" fill="#{PAPER}"/>
        #{security_lines}
        #{welcome_stamp}
        <text x="80" y="110" font-family="Geist Mono, monospace" font-size="30" letter-spacing="6" fill="#{MUTED}">YOU'RE INVITED</text>
        <text x="#{WIDTH - 80}" y="110" text-anchor="end" font-family="Noto Sans Ethiopic, sans-serif" font-size="30" fill="#{MUTED}">ተጋብዘዋል</text>
        #{portrait}
        <text x="80" y="#{headline_y}" font-family="Geist, Noto Sans Ethiopic, sans-serif" font-weight="700" font-size="#{handle_size}" fill="#{INK}">#{escape(handle)}</text>
        <text x="80" y="#{headline_y + 84}" font-family="Geist, sans-serif" font-weight="700" font-size="72" fill="#{CLAY}">invited you for coffee.</text>
        <text x="80" y="#{headline_y + 150}" font-family="Geist, sans-serif" font-size="34" fill="#{MUTED}">A stamp book for the cafés of Addis.</text>
        #{footer}
      </svg>
    SVG
  end

  def to_png
    png, error, status = Open3.capture3("rsvg-convert", "--format=png", stdin_data: to_svg, binmode: true)
    raise ShareCard::RenderError, "rsvg-convert failed: #{error.strip}" unless status.success?

    png
  rescue Errno::ENOENT
    raise ShareCard::RenderError, "rsvg-convert is not installed (apt package librsvg2-bin)"
  end

  private
    def handle
      "@#{user.handle}"
    end

    def headline_y = 640

    # Long handles shrink so they stay inside the card.
    def handle_size
      handle.length > 16 ? (72 * 16.0 / handle.length).floor.clamp(44, 72) : 72
    end

    # The sender, awake, on a small tilted card.
    def portrait
      face = ShareCard::Doodle.new(user.avatar_seed_or_default, "awake", user.avatar_traits)
      <<~SVG
        <g transform="translate(80 190) rotate(-5 160 170)">
          <rect x="0" y="0" width="320" height="340" rx="32" fill="#{RAISED}" stroke="#{BORDER}" stroke-width="2"/>
          <g transform="translate(30 20) scale(2.6)">
            #{face.to_svg(id: 'inviter')}
          </g>
        </g>
      SVG
    end

    # A clay stamp pressed beside the portrait, the first one waiting for them.
    def welcome_stamp
      size = 440
      ink = ShareCard::InkStamp.new(name: "Welcome", amharic: "እንኳን ደህና መጡ · ቡና ፓስፖርት", date: "YOUR FIRST STAMP", id: "welcome")
      scale = size.fdiv(ShareCard::InkStamp::VIEWBOX)
      <<~SVG
        <g opacity="0.92" transform="translate(735 370) rotate(9) translate(#{-size / 2.0} #{-size / 2.0}) scale(#{scale.round(5)})">
          #{ink.to_svg}
        </g>
      SVG
    end

    def footer
      <<~SVG
        <line x1="80" y1="930" x2="#{WIDTH - 80}" y2="930" stroke="#{BORDER}" stroke-width="2"/>
        <text x="80" y="995" font-family="Geist, Noto Serif Ethiopic, sans-serif" font-weight="700" font-size="34" letter-spacing="3" fill="#{INK}">BUNNA PASSPORT · ቡና ፓስፖርት</text>
        <text x="#{WIDTH - 80}" y="995" text-anchor="end" font-family="Geist Mono, monospace" font-size="26" letter-spacing="2" fill="#{MUTED}">TAP ACCEPT BELOW</text>
      SVG
    end

    def security_lines
      (0...(HEIGHT / 90)).map do |row|
        y = 60 + row * 90
        %(<path d="M0 #{y} Q #{WIDTH / 4} #{y - 14} #{WIDTH / 2} #{y} T #{WIDTH} #{y}" fill="none" stroke="#{BORDER}" stroke-width="1.5" opacity="0.55"/>)
      end.join("\n")
    end

    def escape(text)
      ERB::Util.html_escape(text)
    end
end
