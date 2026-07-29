class Shop < ApplicationRecord
  include Locatable

  AMENITIES = %w[
    wifi outdoor_seating jebena_service espresso_bar takeaway parking
  ].freeze

  belongs_to :neighborhood
  belongs_to :submitted_by, class_name: "User"
  belongs_to :merged_into, class_name: "Shop", optional: true

  has_many :merged_shops, class_name: "Shop", foreign_key: :merged_into_id, dependent: :restrict_with_exception
  has_one :hours, class_name: "Shop::Hours", dependent: :destroy
  has_many :photos, class_name: "Shop::Photo", dependent: :destroy
  has_many :check_ins, dependent: :restrict_with_exception
  has_many :stamps, dependent: :restrict_with_exception
  has_many :edits, class_name: "Shop::Edit", dependent: :restrict_with_exception

  enum :status, {
    pending: "pending",
    live: "live",
    hidden: "hidden",
    closed: "closed",
    merged: "merged"
  }, default: :pending, validate: true

  enum :price_band, {
    budget: "budget",
    standard: "standard",
    premium: "premium",
    splurge: "splurge"
  }, validate: { allow_nil: true }

  normalizes :name, :name_am, :landmark, with: ->(value) { value.strip }

  before_validation :set_search_keys
  before_validation :set_slug, on: :create

  validates :name, :name_am, :name_key, :name_am_key, :landmark, presence: true
  validates :slug, presence: true, uniqueness: true
  validate :amenities_are_supported
  validate :merge_target_is_valid

  scope :alphabetically, -> { order(:name) }
  scope :discoverable, -> { live.includes(:neighborhood, :hours, photos: { image_attachment: :blob }) }
  scope :matching, ->(query) {
    key = Shop::Name.normalize(query)
    where("name_key LIKE :key OR name_am_key LIKE :key", key: "%#{sanitize_sql_like(key)}%")
  }
  scope :changed_between, ->(from, to) { where(updated_at: from...to) }

  def self.duplicate_candidates(name:, name_am:, latitude:, longitude:, radius_meters: 200)
    nearby(latitude: latitude, longitude: longitude, radius_meters: radius_meters).select do |shop|
      Shop::Name.similarity(shop.name, name) >= 0.80 ||
        Shop::Name.similarity(shop.name_am, name_am) >= 0.80
    end
  end

  def merge_into!(winner, by:)
    raise NotAuthorized, "User cannot merge shops" unless mergeable_by?(by)
    raise ArgumentError, "Cannot merge a shop into itself" if winner == self
    raise ArgumentError, "Merge target must be live" unless winner.live?

    transaction do
      affected_user_ids = stamps.distinct.pluck(:user_id)

      stamps.find_each do |stamp|
        if existing = winner.stamps.find_by(user: stamp.user)
          if stamp.earned_at < existing.earned_at
            existing.update!(first_check_in: stamp.first_check_in, earned_at: stamp.earned_at)
          end
          stamp.destroy!
        else
          stamp.update!(shop: winner)
        end
      end

      check_ins.update_all(shop_id: winner.id, updated_at: Time.current)
      photos.update_all(shop_id: winner.id, updated_at: Time.current)
      update!(status: :merged, merged_into: winner)
      winner.recount_activity!
      recount_activity!
      User.where(id: affected_user_ids).find_each do |user|
        user.update_columns(stamps_count: user.stamps.count, updated_at: Time.current)
      end
    end
  end

  def mergeable_by?(user)
    !merged? && user&.can_merge_shops?
  end

  def canonical
    merged? ? merged_into.canonical : self
  end

  def recount_activity!
    update_columns(
      check_ins_count: check_ins.verified.count,
      stamps_count: stamps.count,
      updated_at: Time.current
    )
  end

  def api_attributes
    amenities.slice(*AMENITIES)
  end

  class NotAuthorized < StandardError; end

  private
    def set_search_keys
      self.name_key = Shop::Name.normalize(name)
      self.name_am_key = Shop::Name.normalize(name_am)
    end

    def set_slug
      return if slug.present?

      base = name.to_s.parameterize.presence || "shop"
      self.slug = base
      self.slug = "#{base}-#{SecureRandom.hex(3)}" if Shop.exists?(slug: slug)
    end

    def amenities_are_supported
      unsupported = amenities.to_h.keys - AMENITIES
      errors.add(:amenities, "contains unsupported values: #{unsupported.join(", ")}") if unsupported.any?
    end

    def merge_target_is_valid
      errors.add(:merged_into, "is required for a merged shop") if merged? && merged_into.blank?
      errors.add(:merged_into, "must be absent unless merged") if !merged? && merged_into.present?
    end
end
