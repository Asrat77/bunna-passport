# Counter stickers for partner cafés, printed from the browser. Each one's QR
# code opens that café's page in the Mini App (startapp=<slug>), counts as a
# scan for the café (Shop::Scan), and tags a signup with the café ("qr-<id>"),
# so the weekly report can say which sticker brought people.
#
# Also makes a tracked link for anything else, like a post or a poster.
#
# Table tents (format=tent) are the pilot's QR stands: two A6 panels on a
# strip, two strips to an A4 sheet. Cut down the middle and fold each strip
# in half, and the café's QR faces both sides of the table.
class Console::StickersController < Console::BaseController
  FORMATS = %w[ sticker tent ].freeze

  # The tent's Amharic call to action. Machine-drafted: a native speaker
  # has to check it before anything is printed for a café.
  TENT_CALL = "Scan for the menu and your Bunna Passport stamp"
  TENT_CALL_AM = "ምናሌውን ለማየትና የቡና ፓስፖርት ማህተምዎን ለማግኘት ስካን ያድርጉ"
  TENT_CALL_AM_REVIEWED = false
  TENT_TAGLINE = "the coffee map of Addis"

  def index
    @format = params[:format_type].presence_in(FORMATS) || "sticker"
    @neighborhoods = Neighborhood.order(:name)
    @neighborhood = Neighborhood.find_by(id: params[:neighborhood_id]) || Neighborhood.find_by(name: "Bole")
    @candidates = @neighborhood ? Shop.live.where(neighborhood: @neighborhood).alphabetically : Shop.none

    @shops = Shop.where(id: Array(params[:shop_ids])).includes(:neighborhood).alphabetically.to_a
    @stickers = @shops.map { |shop| [ shop, sticker_link(shop) ] }

    @source = LaunchLink.clean_source(params[:source])
    @tracked_link = LaunchLink.url(base_url: request.base_url, source: @source) if @source
  end

  private
    def sticker_link(shop)
      LaunchLink.stand_url(shop, base_url: request.base_url)
    end
end
