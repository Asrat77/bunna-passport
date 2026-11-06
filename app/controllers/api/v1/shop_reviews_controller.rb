class Api::V1::ShopReviewsController < Api::V1::BaseController
  # Reading a shop needs no account, and neither does reading what people said
  # about it — the catalogue is public.
  allow_unauthenticated_access only: :index

  PAGE_SIZE = 20

  # A review is what someone said on a visit we verified. There is no separate
  # review record, so nobody can rate a shop they have not stood inside.
  #
  # Pages newest first with `cursor` (the last id seen). `filter=notes` keeps
  # reviews with words in them; `filter=photos` keeps ones with a photo. The
  # summary always describes the whole shop, whatever the filter.
  def index
    shop = Shop.where.not(status: %w[ hidden pending ]).find(params[:shop_id])
    reviews = shop.check_ins.reviews
    reviews = reviews.with_notes if params[:filter] == "notes"
    reviews = reviews.with_photos if params[:filter] == "photos"
    paged = params[:cursor].present? ? reviews.where("check_ins.id < ?", params[:cursor].to_i) : reviews
    page = paged.limit(PAGE_SIZE).includes(:user, photo_attachment: :blob).to_a

    render_data(
      page.map { |check_in| review_json(check_in) },
      meta: summary_json(shop).merge(
        total: reviews.count,
        next_cursor: page.size == PAGE_SIZE ? page.last.id : nil
      )
    )
  end

  private
    def summary_json(shop)
      check_ins = shop.check_ins
      ratings = check_ins.rating_summary
      {
        rating_average: ratings[:average],
        rating_count: ratings[:count],
        distribution: ratings[:distribution],
        top_tags: check_ins.top_tags,
        typical_prices: check_ins.typical_prices
      }
    end

    def review_json(check_in)
      user = check_in.user
      {
        id: check_in.id,
        user: {
          id: user.id,
          handle: user.handle,
          display_name: user.display_name,
          avatar_seed: user.avatar_seed,
          avatar_traits: user.avatar_traits
        },
        rating: check_in.rating,
        note: check_in.note,
        drink: check_in.drink,
        tags: check_in.tags,
        price_birr: check_in.price_birr,
        photo: review_photo_json(check_in),
        occurred_at: check_in.occurred_at.iso8601
      }
    end

    def review_photo_json(check_in)
      return nil unless check_in.photo.attached?

      { thumb: url_for(check_in.photo.variant(:thumb)), full: url_for(check_in.photo.variant(:full)) }
    end
end
