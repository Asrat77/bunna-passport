module Locatable
  extend ActiveSupport::Concern

  EARTH_RADIUS_METERS = 6_371_000.0

  included do
    validates :latitude, numericality: { in: -90..90 }
    validates :longitude, numericality: { in: -180..180 }
  end

  class_methods do
    def nearby(latitude:, longitude:, radius_meters:)
      latitude = Float(latitude)
      longitude = Float(longitude)
      radius_meters = Float(radius_meters)
      latitude_delta = radius_meters / 111_045.0
      longitude_delta = radius_meters / (111_045.0 * Math.cos(radians(latitude)).abs.clamp(0.01, 1.0))

      where(latitude: (latitude - latitude_delta)..(latitude + latitude_delta))
        .where(longitude: (longitude - longitude_delta)..(longitude + longitude_delta))
    end

    private
      def radians(degrees)
        degrees * Math::PI / 180
      end
  end

  def distance_from(latitude:, longitude:)
    latitude_delta = radians(Float(latitude) - self.latitude.to_f)
    longitude_delta = radians(Float(longitude) - self.longitude.to_f)
    origin_latitude = radians(self.latitude.to_f)
    target_latitude = radians(Float(latitude))

    haversine = Math.sin(latitude_delta / 2)**2 +
      Math.cos(origin_latitude) * Math.cos(target_latitude) * Math.sin(longitude_delta / 2)**2

    (EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))).round
  end

  private
    def radians(degrees)
      degrees * Math::PI / 180
    end
end
