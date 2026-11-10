# Counter stickers for partner cafés, printed from the browser. Each one's QR
# code opens that café's page in the Mini App and tags the signup with the
# café ("qr-<id>"), so the weekly report can say which sticker brought people.
#
# Also makes a tracked link for anything else, like a post or a poster.
class Console::StickersController < Console::BaseController
  def index
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
      LaunchLink.url(base_url: request.base_url, shop: shop.id, source: LaunchLink.sticker_source(shop))
    end
end
