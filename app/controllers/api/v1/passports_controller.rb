class Api::V1::PassportsController < Api::V1::BaseController
  def show
    stamps = Current.user.stamps.reverse_chronologically.includes(:shop)
    total = Shop.live.count
    render_data(
      {
        stamps: stamps.map do |stamp|
          {
            id: stamp.id,
            shop: { id: stamp.shop_id, name: stamp.shop.name, name_am: stamp.shop.name_am },
            earned_at: stamp.earned_at.iso8601
          }
        end,
        stamped_count: stamps.size,
        total_shops: total,
        completion_percentage: total.zero? ? 0 : (stamps.size.fdiv(total) * 100).round(1)
      }
    )
  end
end
