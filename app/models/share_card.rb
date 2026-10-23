require "open3"

# The image a user shares after a check-in: their passport stamp for the shop
# on cream passport paper, their doodle "after coffee", and the wordmark. It
# carries no name, handle, time of day or coordinates (see the share card plan).
#
# Two sizes from one layout: a 4:5 post for chats and feeds, and a 9:16 story
# for Telegram, Instagram and TikTok stories. Rendered by librsvg's
# rsvg-convert with the fonts in vendor/fonts/share_card. It runs as its own
# process because Active Storage blocks libvips' SVG loader in this one, which
# keeps uploaded SVGs away from librsvg; the cards are SVG we wrote ourselves.
class ShareCard
  class RenderError < StandardError; end

  # Bump when the layout changes, so stored cards are drawn again on their
  # next share.
  VERSION = 1

  FORMATS = {
    "post" => { width: 1080, height: 1350, header_y: 110, stamp_y: 540, stamp_size: 720, doodle: [ 710, 850 ], footer_y: 1250 },
    # Stories keep clear of the top 250px and bottom 340px, where Instagram,
    # TikTok and Telegram draw their own controls.
    "story" => { width: 1080, height: 1920, header_y: 300, stamp_y: 760, stamp_size: 760, doodle: [ 400, 1150 ], footer_y: 1575 }
  }.freeze

  PAPER = "#F6F0E6".freeze
  RAISED = "#FFFBF5".freeze
  BORDER = "#E2D5C3".freeze
  INK = "#341B11".freeze
  MUTED = "#6B5A4C".freeze

  attr_reader :check_in, :format

  def initialize(check_in, format: "post", doodle: true)
    raise ArgumentError, "unknown share card format #{format.inspect}" unless FORMATS.key?(format.to_s)

    @check_in = check_in
    @format = format.to_s
    @doodle = doodle
  end

  def width = layout[:width]
  def height = layout[:height]

  def to_svg
    <<~SVG
      <svg xmlns="http://www.w3.org/2000/svg" width="#{width}" height="#{height}" viewBox="0 0 #{width} #{height}">
        <rect width="#{width}" height="#{height}" fill="#{PAPER}"/>
        #{security_lines}
        <text x="80" y="#{layout[:header_y]}" font-family="Geist Mono, Noto Sans Ethiopic, monospace" font-size="30" letter-spacing="4" fill="#{MUTED}">#{escape(neighborhood_line)}</text>
        <text x="#{width - 80}" y="#{layout[:header_y]}" text-anchor="end" font-family="Geist Mono, monospace" font-size="30" letter-spacing="4" fill="#{MUTED}">STAMP №#{stamp_number}</text>
        #{stamp}
        #{doodle}
        #{footer}
      </svg>
    SVG
  end

  def to_png
    png, error, status = Open3.capture3("rsvg-convert", "--format=png", stdin_data: to_svg, binmode: true)
    raise RenderError, "rsvg-convert failed: #{error.strip}" unless status.success?

    png
  rescue Errno::ENOENT
    raise RenderError, "rsvg-convert is not installed (apt package librsvg2-bin)"
  end

  private
    def layout
      FORMATS.fetch(@format)
    end

    def shop
      check_in.shop
    end

    def user
      check_in.user
    end

    def neighborhood_line
      "#{shop.neighborhood.name.upcase} · #{shop.neighborhood.name_am}"
    end

    # This stamp's place in the user's passport: 12 means their twelfth shop.
    def stamp_number
      earned = user.stamps.find_by(shop: shop)&.earned_at || check_in.occurred_at
      user.stamps.where(earned_at: ..earned).count.clamp(1..)
    end

    def stamp
      size = layout[:stamp_size]
      scale = size.fdiv(ShareCard::InkStamp::VIEWBOX)
      rotation = ShareCard::InkStamp.rotation(shop.id)
      ink = ShareCard::InkStamp.new(
        name: shop.name,
        amharic: "#{shop.name_am} · #{shop.neighborhood.name_am}",
        date: ShareCard::InkStamp.date(check_in.occurred_at.in_time_zone(User::COFFEE_DAY_ZONE))
      )
      <<~SVG
        <g transform="translate(#{width / 2} #{layout[:stamp_y]}) rotate(#{rotation}) translate(#{-size / 2.0} #{-size / 2.0}) scale(#{scale.round(5)})">
          #{ink.to_svg}
        </g>
      SVG
    end

    # The user's doodle, awake, on a small tilted card: "You, after coffee".
    def doodle
      return "" unless @doodle

      x, y = layout[:doodle]
      face = ShareCard::Doodle.new(doodle_seed, "awake")
      <<~SVG
        <g transform="translate(#{x} #{y}) rotate(-6 140 170)">
          <rect x="0" y="0" width="280" height="340" rx="28" fill="#{RAISED}" stroke="#{BORDER}" stroke-width="2"/>
          <g transform="translate(25 24) scale(2.3)">
            #{face.to_svg}
          </g>
          <text x="140" y="306" text-anchor="middle" font-family="Geist, sans-serif" font-weight="700" font-size="26" fill="#{INK}">You, after coffee</text>
        </g>
      SVG
    end

    # The seed the Mini App draws your own doodle from (web/src/data/me.ts).
    def doodle_seed
      user.avatar_seed.presence || user.telegram_user_id&.to_s || user.id.to_s
    end

    def footer
      y = layout[:footer_y]
      link = bot_link && %(<text x="#{width / 2}" y="#{y + 46}" text-anchor="middle" font-family="Geist Mono, monospace" font-size="26" letter-spacing="2" fill="#{MUTED}">#{escape(bot_link)}</text>)
      <<~SVG
        <text x="#{width / 2}" y="#{y}" text-anchor="middle" font-family="Geist, Noto Serif Ethiopic, sans-serif" font-weight="700" font-size="38" letter-spacing="3" fill="#{INK}">BUNNA PASSPORT · ቡና ፓስፖርት</text>
        #{link}
      SVG
    end

    def bot_link
      username = ENV["TELEGRAM_BOT_USERNAME"].presence
      username && "t.me/#{username.delete_prefix('@')}"
    end

    # The faint wavy lines of the passport page.
    def security_lines
      waves = (0...(height / 90)).map do |row|
        y = 60 + row * 90
        %(<path d="M0 #{y} Q #{width / 4} #{y - 14} #{width / 2} #{y} T #{width} #{y}" fill="none" stroke="#{BORDER}" stroke-width="1.5" opacity="0.55"/>)
      end
      waves.join("\n")
    end

    def escape(text)
      ERB::Util.html_escape(text)
    end
end
