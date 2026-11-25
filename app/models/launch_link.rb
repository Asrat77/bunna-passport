# The links that bring people into the Mini App, and what they carry: whose
# invite it is, which café to open, and where the link was posted, so the
# weekly report can say which sticker, post or friend brought a signup.
#
# Inside Telegram it all rides in the Mini App's start parameter, which may
# only hold A-Z, a-z, 0-9, _ and - (https://core.telegram.org/bots/webapps).
# Parts are joined with "__":
#
#   invite_<token>                 a friend's invite (the original format)
#   tomoca-bole                    a café's QR stand: just its slug
#   shop_<id>__src_qr-<id>         a café's counter sticker (the first stickers)
#   src_ig-addiscoffee             a post
#
# A slug never holds "_" (Shop#set_slug parameterizes the name), so a part
# without one can only be a slug.
#
# Off Telegram the same parts are query parameters on /app:
# ?invite=<token>&shop=<id>&src=<source>.
module LaunchLink
  SEPARATOR = "__"
  SOURCE = /\A[a-z0-9][a-z0-9-]{0,39}\z/
  TOKEN = /\A[A-Za-z0-9]{8,64}\z/
  SLUG = /\A[a-z0-9][a-z0-9-]{0,99}\z/
  STICKER_PREFIX = "qr-"

  Params = Data.define(:invite, :shop, :source, :slug) do
    def initialize(invite: nil, shop: nil, source: nil, slug: nil)
      super
    end

    # Whether the link meant to open a café, found or not.
    def names_shop?
      shop.present? || slug.present?
    end

    # The live café the link names, followed through a merge; nil when it
    # names none, or one that's gone.
    def shop_record
      return unless names_shop?

      found = shop ? Shop.find_by(id: shop) : Shop.find_by(slug: slug)
      found = found&.canonical
      found if found&.live?
    end

    # What to record on a new account: the tag the link carried, or failing
    # that what kind of link it was. A bare slug is a café's QR stand, so it
    # counts like that café's sticker.
    def signup_source(shop_record = nil)
      source ||
        ("invite" if invite) ||
        (LaunchLink.sticker_source(shop_record) if slug && shop_record) ||
        ("shop" if shop || shop_record)
    end
  end

  module_function

  # "IG Addis Coffee" -> "ig-addis-coffee"; nil when nothing usable is left.
  def clean_source(value)
    source = value.to_s.downcase.gsub(/[^a-z0-9]+/, "-").gsub(/\A-+|-+\z/, "")[0, 40].to_s.delete_suffix("-")
    source.match?(SOURCE) ? source : nil
  end

  def sticker_source(shop)
    "#{STICKER_PREFIX}#{shop.id}"
  end

  # The café a sticker's source names, so a report can say "Tomoca" rather than "qr-12".
  def sticker_shop_id(source)
    return unless source.to_s.start_with?(STICKER_PREFIX)

    Integer(source.delete_prefix(STICKER_PREFIX), exception: false)
  end

  def start_param(invite: nil, shop: nil, source: nil, slug: nil)
    parts = []
    parts << slug if slug.to_s.match?(SLUG)
    parts << "invite_#{invite}" if invite
    parts << "shop_#{shop}" if shop
    parts << "src_#{clean_source(source)}" if clean_source(source)
    parts.join(SEPARATOR).presence
  end

  def parse(start_param)
    pieces = start_param.to_s.split(SEPARATOR)
    parts = pieces.select { |part| part.include?("_") }.to_h { |part| part.split("_", 2) }
    Params.new(
      invite: parts["invite"].to_s.match?(TOKEN) ? parts["invite"] : nil,
      shop: Integer(parts["shop"].to_s, exception: false)&.then { |id| id.positive? ? id : nil },
      source: clean_source(parts["src"]),
      slug: pieces.find { |part| part.match?(SLUG) }
    )
  end

  # A café's QR stand: its page in the Mini App, by slug, which also reads
  # better than an id if someone types it. Off Telegram, the website's
  # ?shop= link with the sticker's tag.
  def stand_url(shop, base_url:)
    if ENV["TELEGRAM_BOT_USERNAME"].present? && shop.slug.to_s.match?(SLUG)
      url(base_url: base_url, slug: shop.slug)
    else
      url(base_url: base_url, shop: shop.id, source: sticker_source(shop))
    end
  end

  # The bot's Mini App link when there is a bot, or /app on `base_url`.
  def url(base_url:, invite: nil, shop: nil, source: nil, slug: nil)
    if (bot = ENV["TELEGRAM_BOT_USERNAME"].presence&.delete_prefix("@"))
      app = ENV["TELEGRAM_MINI_APP_NAME"].presence
      param = start_param(invite: invite, shop: shop, source: source, slug: slug)
      "https://t.me/#{[ bot, app ].compact.join('/')}#{"?startapp=#{param}" if param}"
    else
      base = ENV["PUBLIC_BASE_URL"].presence || base_url
      query = { invite: invite, shop: shop, src: clean_source(source) }.compact.to_query
      "#{base.delete_suffix('/')}/app#{"?#{query}" if query.present?}"
    end
  end
end
