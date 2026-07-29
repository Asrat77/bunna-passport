class CheckIn < ApplicationRecord
  include Locatable
  include ImageAttachable

  ACCURACY_LIMIT_METERS = 100
  DISTANCE_LIMIT_METERS = 250
  SHOP_COOLDOWN = 4.hours
  DAILY_LIMIT = 8
  MAX_SPEED_KPH = 120
  NEW_ACCOUNT_LIMIT = 3

  belongs_to :user
  belongs_to :shop
  has_one :stamp, foreign_key: :first_check_in_id, dependent: :restrict_with_exception
  has_one_attached :photo

  enum :status, {
    verified: "verified",
    flagged: "flagged",
    rejected: "rejected"
  }, validate: true

  validates :idempotency_key, presence: true, uniqueness: { scope: :user_id }, length: { maximum: 100 }
  validates :accuracy_meters, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :distance_meters, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :rating, numericality: { only_integer: true, in: 1..5 }, allow_nil: true
  validates :note, length: { maximum: 280 }
  validate :acceptable_photo

  scope :reverse_chronologically, -> { order(occurred_at: :desc, id: :desc) }

  def self.record!(user:, shop:, idempotency_key:, latitude:, longitude:, accuracy_meters:, mock_location: false, drink: nil, rating: nil, note: nil, photo: nil)
    return user.check_ins.find_by(idempotency_key: idempotency_key) if user.check_ins.exists?(idempotency_key: idempotency_key)

    transaction do
      user.lock!
      shop.lock!

      occurred_at = Time.current
      distance_meters = shop.distance_from(latitude: latitude, longitude: longitude)
      status, reason = classify(
        user: user,
        shop: shop,
        occurred_at: occurred_at,
        latitude: latitude,
        longitude: longitude,
        accuracy_meters: accuracy_meters,
        distance_meters: distance_meters,
        mock_location: mock_location
      )

      check_in = new(
        user: user,
        shop: shop,
        idempotency_key: idempotency_key,
        occurred_at: occurred_at,
        latitude: latitude,
        longitude: longitude,
        accuracy_meters: accuracy_meters,
        distance_meters: distance_meters,
        mock_location: mock_location,
        status: status,
        flag_reason: reason,
        drink: drink,
        rating: rating,
        note: note
      )
      check_in.photo.attach(photo) if photo.present?
      check_in.save!

      check_in.apply_verified_activity! if check_in.verified?
      check_in.earn_stamp! if check_in.flagged?
      check_in
    end
  rescue ActiveRecord::RecordNotUnique
    user.check_ins.find_by!(idempotency_key: idempotency_key)
  end

  def self.classify(user:, shop:, occurred_at:, latitude:, longitude:, accuracy_meters:, distance_meters:, mock_location:)
    return [ :rejected, "weak_gps" ] if accuracy_meters.to_i > ACCURACY_LIMIT_METERS
    return [ :rejected, "too_far" ] if distance_meters > DISTANCE_LIMIT_METERS
    return [ :rejected, "cooldown" ] if user.check_ins.where(shop: shop).where.not(status: :rejected).where(occurred_at: SHOP_COOLDOWN.ago..).exists?
    return [ :rejected, "daily_limit" ] if user.check_ins.where(created_at: Time.current.all_day).count >= DAILY_LIMIT
    return [ :flagged, "implausible_travel" ] if implausible_travel?(user, occurred_at, latitude, longitude)
    return [ :flagged, "mock_location" ] if ActiveModel::Type::Boolean.new.cast(mock_location)
    return [ :flagged, "new_account_velocity" ] if user.created_at >= 1.hour.ago && user.check_ins.where(created_at: 1.hour.ago..).count >= NEW_ACCOUNT_LIMIT

    [ :verified, nil ]
  end

  def verify!
    return self if verified? && counted_at.present?
    raise InvalidTransition unless flagged? || verified?

    transaction do
      update!(status: :verified, flag_reason: nil)
      apply_verified_activity!
    end
  end

  def reject!
    raise InvalidTransition unless flagged?

    update!(status: :rejected)
  end

  def apply_verified_activity!
    return if counted_at.present?

    transaction do
      user.increment!(:verified_check_ins_count)
      shop.increment!(:check_ins_count)
      earn_stamp!
      update!(verified_at: Time.current, counted_at: Time.current)
    end

    AwardBadgesJob.perform_later(user)
    EvaluateTrustJob.perform_later(user)
  end

  def earn_stamp!
    Stamp.create!(
      user: user,
      shop: shop,
      first_check_in: self,
      earned_at: occurred_at
    )
    user.increment!(:stamps_count)
    shop.increment!(:stamps_count)
  rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid => error
    raise error unless user.stamps.exists?(shop: shop)
  end

  def public_status
    rejected? ? "rejected" : "accepted"
  end

  def self.implausible_travel?(user, occurred_at, latitude, longitude)
    previous = user.check_ins.where.not(status: :rejected).order(occurred_at: :desc).first
    return false unless previous

    hours = (occurred_at - previous.occurred_at) / 1.hour
    return false if hours <= 0

    distance_km = previous.distance_from(latitude: latitude, longitude: longitude) / 1_000.0
    distance_km / hours > MAX_SPEED_KPH
  end

  class InvalidTransition < StandardError; end

  private
    def acceptable_photo
      acceptable_image(photo, required: false)
    end
end
