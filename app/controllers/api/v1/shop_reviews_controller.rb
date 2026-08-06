class Api::V1::ShopReviewsController < Api::V1::BaseController
  # Reading a shop needs no account, and neither does reading what people said
  # about it — the catalogue is public.
  allow_unauthenticated_access only: :index

  PAGE_SIZE = 20

  # A review is what someone said on a visit we verified. There is no separate
  # review record, so nobody can rate a shop they have not stood inside.
  def index
    shop = Shop.where.not(status: %w[ hidden pending ]).find(params[:shop_id])
    reviews = shop.check_ins.reviews.includes(:user)
    page = reviews.limit(PAGE_SIZE)

    render_data(
      page.map { |check_in| review_json(check_in) },
      meta: {
        rating_average: shop.check_ins.rating_average,
        rating_count: shop.check_ins.rated.count,
        total: reviews.count
      }
    )
  end

  private
    def review_json(check_in)
      {
        id: check_in.id,
        user: {
          id: check_in.user_id,
          handle: check_in.user.handle,
          display_name: check_in.user.display_name
        },
        rating: check_in.rating,
        note: check_in.note,
        drink: check_in.drink,
        occurred_at: check_in.occurred_at.iso8601
      }
    end
end
