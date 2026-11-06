# Sets price bands from what people paid. With a shop, refreshes that one
# (after a review's price changes); without, every shop with reports, so old
# reports age out of PRICE_WINDOW and hidden reviews stop counting.
class RefreshPriceBandsJob < ApplicationJob
  queue_as :default

  def perform(shop = nil)
    if shop
      shop.refresh_price_band_from_reports!
    else
      Shop.where(id: CheckIn.where.not(price_birr: nil).select(:shop_id))
        .or(Shop.where.not(price_band_reports_count: 0))
        .find_each(&:refresh_price_band_from_reports!)
    end
  end
end
