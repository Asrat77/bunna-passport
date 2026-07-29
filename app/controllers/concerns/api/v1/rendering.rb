module Api::V1::Rendering
  extend ActiveSupport::Concern

  private
    def render_error(status, code, message, details = nil)
      body = { code: code, message: message }
      body[:details] = details if details.present?
      render json: body, status: status
    end

    def render_data(data, status: :ok, meta: nil, location: nil)
      body = { data: data }
      body[:meta] = meta if meta
      render json: body, status: status, location: location
    end

    def user_json(user)
      {
        id: user.id,
        handle: user.handle,
        display_name: user.display_name,
        trust_level: user.trust_level,
        verified_check_ins_count: user.verified_check_ins_count,
        stamps_count: user.stamps_count,
        home_neighborhood_id: user.home_neighborhood_id
      }
    end

    def shop_json(shop, detailed: false)
      data = {
        id: shop.id,
        name: shop.name,
        name_am: shop.name_am,
        slug: shop.slug,
        neighborhood: {
          id: shop.neighborhood_id,
          name: shop.neighborhood.name,
          name_am: shop.neighborhood.name_am
        },
        landmark: shop.landmark,
        latitude: shop.latitude.to_f,
        longitude: shop.longitude.to_f,
        status: shop.status,
        price_band: shop.price_band,
        attributes: shop.api_attributes,
        updated_at: shop.updated_at.iso8601(6)
      }
      return data unless detailed

      data.merge(
        check_ins_count: shop.check_ins_count,
        stamps_count: shop.stamps_count,
        hours: hours_json(shop.hours),
        photos: shop.photos.map { |photo| photo_json(photo) },
        merged_into_id: shop.merged_into_id
      )
    end

    def hours_json(hours)
      return { schedule: {}, freshness: "unknown", confirmed_at: nil } unless hours

      {
        schedule: hours.schedule,
        freshness: hours.freshness,
        confirmed_at: hours.confirmed_at.iso8601
      }
    end

    def photo_json(photo)
      {
        id: photo.id,
        caption: photo.caption,
        urls: {
          thumb: url_for(photo.image.variant(:thumb)),
          medium: url_for(photo.image.variant(:medium)),
          full: url_for(photo.image.variant(:full))
        }
      }
    end

    def contribution_json(contribution)
      {
        id: contribution.id,
        type: contribution.contributable_type,
        status: contribution.status,
        confirmation_count: contribution.confirmations.size,
        reviewed_at: contribution.reviewed_at&.iso8601,
        rejection_reason: contribution.rejection_reason,
        created_at: contribution.created_at.iso8601
      }
    end

    def check_in_json(check_in)
      {
        id: check_in.id,
        shop: {
          id: check_in.shop_id,
          name: check_in.shop.name,
          name_am: check_in.shop.name_am
        },
        status: check_in.public_status,
        rejection_code: check_in.rejected? ? check_in.flag_reason : nil,
        distance_meters: check_in.distance_meters,
        drink: check_in.drink,
        rating: check_in.rating,
        note: check_in.note,
        occurred_at: check_in.occurred_at.iso8601
      }
    end
end
