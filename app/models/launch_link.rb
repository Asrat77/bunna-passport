# The links that bring people into the Mini App, and what they carry: whose
# invite it is, which café to open, and where the link was posted, so the
# weekly report can say which sticker, post or friend brought a signup.
#
# Inside Telegram it all rides in the Mini App's start parameter, which may
# only hold A-Z, a-z, 0-9, _ and - (https://core.telegram.org/bots/webapps).
# Parts are joined with "__":
#
#   invite_<token>                 a friend's invite (the original format)
#   shop_<id>__src_qr-<id>         a café's counter sticker
#   src_ig-addiscoffee             a post
#
# Off Telegram the same parts are query parameters on /app:
# ?invite=<token>&shop=<id>&src=<source>.
module LaunchLink
  SEPARATOR = "__"
  SOURCE = /\A[a-z0-9][a-z0-9-]{0,39}\z/
  TOKEN = /\A[A-Za-z0-9]{8,64}\z/
  STICKER_PREFIX = "qr-"

  Params = Data.define(:invite, :shop, :source) do
    # What to record on a new account: the tag the link carried, or failing
    # that what kind of link it was.
    def signup_source
      source || ("invite" if invite) || ("shop" if shop)
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

  def start_param(invite: nil, shop: nil, source: nil)
    parts = []
    parts << "invite_#{invite}" if invite
    parts << "shop_#{shop}" if shop
    parts << "src_#{clean_source(source)}" if clean_source(source)
    parts.join(SEPARATOR).presence
  end

  def parse(start_param)
    parts = start_param.to_s.split(SEPARATOR).to_h { |part| part.split("_", 2).then { |key, value| [ key, value.to_s ] } }
    Params.new(
      invite: parts["invite"].to_s.match?(TOKEN) ? parts["invite"] : nil,
      shop: Integer(parts["shop"].to_s, exception: false)&.then { |id| id.positive? ? id : nil },
      source: clean_source(parts["src"])
    )
  end

  # The bot's Mini App link when there is a bot, or /app on `base_url`.
  def url(base_url:, invite: nil, shop: nil, source: nil)
    if (bot = ENV["TELEGRAM_BOT_USERNAME"].presence&.delete_prefix("@"))
      app = ENV["TELEGRAM_MINI_APP_NAME"].presence
      param = start_param(invite: invite, shop: shop, source: source)
      "https://t.me/#{[ bot, app ].compact.join('/')}#{"?startapp=#{param}" if param}"
    else
      base = ENV["PUBLIC_BASE_URL"].presence || base_url
      query = { invite: invite, shop: shop, src: clean_source(source) }.compact.to_query
      "#{base.delete_suffix('/')}/app#{"?#{query}" if query.present?}"
    end
  end
end
