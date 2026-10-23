class Api::V1::FeedsController < Api::V1::BaseController
  # Friends' verified visits, newest first. Each says which coffee day it
  # happened on, never the time: a feed that read "Tomoca, 10 minutes ago"
  # would tell friends where someone is right now.
  def show
    limit = params.fetch(:limit, 30).to_i.clamp(1, 100)
    check_ins = cursor_scope(CheckIn.friend_feed_for(Current.user), limit: limit)
      .includes(:user, shop: :neighborhood).to_a
    stamps = Stamp.where(first_check_in_id: check_ins.map(&:id)).pluck(:first_check_in_id).to_set
    levels = Stamp.where(user_id: check_ins.map(&:user_id).uniq, shop_id: check_ins.map(&:shop_id).uniq)
      .to_h { |stamp| [ [ stamp.user_id, stamp.shop_id ], stamp.level ] }
    cup_today_ids = User.ids_with_cup_today(check_ins.map(&:user_id).uniq)

    render_data(
      check_ins.map do |check_in|
        {
          id: check_in.id,
          user: friend_json(check_in.user, cup_today_ids),
          shop: {
            id: check_in.shop_id,
            name: check_in.shop.name,
            name_am: check_in.shop.name_am,
            neighborhood: { id: check_in.shop.neighborhood_id, name: check_in.shop.neighborhood.name, name_am: check_in.shop.neighborhood.name_am }
          },
          coffee_day: User.coffee_day_start(check_in.occurred_at).to_date.iso8601,
          stamp_earned: stamps.include?(check_in.id),
          stamp_level: levels[[ check_in.user_id, check_in.shop_id ]],
          drink: check_in.drink,
          rating: check_in.rating,
          note: check_in.note
        }
      end,
      meta: { next_cursor: check_ins.size == limit ? check_ins.last.id : nil }
    )
  end
end
