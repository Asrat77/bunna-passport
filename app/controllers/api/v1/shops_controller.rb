class Api::V1::ShopsController < Api::V1::BaseController
  allow_unauthenticated_access only: %i[ index show ]
  rate_limit to: 10, within: 1.day, only: :create

  def index
    sync_until = Time.current
    changed = shops_changed_before(sync_until)
    etag = [ "shops-v1", changed.maximum(:updated_at), params[:bbox], params[:updated_since], params[:q] ]
    return unless stale?(etag: etag)

    live_shops = changed.live.includes(:neighborhood, :hours, photos: { image_attachment: :blob })
    tombstones = changed.where(status: %w[ hidden closed merged ]).map do |shop|
      { id: shop.id, status: shop.status, merged_into_id: shop.merged_into_id, updated_at: shop.updated_at.iso8601(6) }
    end
    render_data(
      {
        shops: live_shops.map { |shop| shop_json(shop) },
        tombstones: tombstones
      },
      meta: { sync_until: sync_until.iso8601(6) }
    )
  end

  def show
    shop = Shop.where.not(status: %w[ hidden pending ])
      .includes(:neighborhood, :hours, photos: { image_attachment: :blob })
      .find(params[:id])
    render_data(shop_json(shop, detailed: true))
  end

  def create
    submission = Shop::Submission.new(shop_params)
    submission.validate!
    candidates = submission.duplicate_candidates
    if candidates.any? && !submission.duplicate_override?
      return render_error(
        :conflict,
        "duplicate_candidates",
        "Similar nearby shops already exist",
        candidates.map { |shop| shop_json(shop) }
      )
    end

    contribution = Contribution.record!(user: Current.user, contributable: submission)
    render_data(contribution_json(contribution), status: :created, location: api_v1_contribution_url(contribution))
  end

  private
    def shops_changed_before(sync_until)
      shops = Shop.where(updated_at: ...sync_until)
      shops = shops.where("updated_at > ?", Time.iso8601(params[:updated_since])) if params[:updated_since].present?
      shops = shops.matching(params[:q]) if params[:q].present?
      shops = within_bbox(shops) if params[:bbox].present?
      shops
    rescue ArgumentError
      raise ActionController::BadRequest, "Invalid timestamp or bounding box"
    end

    def within_bbox(shops)
      west, south, east, north = params[:bbox].split(",").map { |value| Float(value) }
      raise ArgumentError unless [ west, south, east, north ].all?

      shops.where(latitude: south..north, longitude: west..east)
    end

    def shop_params
      params.expect(shop: [
        :name, :name_am, :neighborhood_id, :landmark, :latitude, :longitude,
        :price_band, :duplicate_override, { amenities: {}, hours: {} }
      ])
    end
end
