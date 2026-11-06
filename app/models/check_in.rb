class CheckIn < ApplicationRecord
  include Locatable
  include ImageAttachable

  ACCURACY_LIMIT_METERS = 100
  DISTANCE_LIMIT_METERS = 250
  SHOP_COOLDOWN = 4.hours
  DAILY_LIMIT = 8
  MAX_SPEED_KPH = 120
  NEW_ACCOUNT_LIMIT = 3
  FEED_WINDOW = 30.days

  # Quick things to say about a café without typing, sent as codes so each
  # reader sees them in their own language.
  TAGS = %w[ great_coffee cozy friendly_staff quick_service good_for_work good_value quiet lively ].freeze
  MAX_TAGS = 4
  # Drinks the apps offer, as codes. Older visits may carry free text.
  DRINKS = %w[ macchiato buna spris espresso latte ].freeze
  # How long after a visit its own rating, note, tags and price can still be
  # filled in, from the app or from the bot's prompt.
  SAYING_WINDOW = 7.days
  # How long after a silent visit the bot asks how it was.
  REVIEW_PROMPT_DELAY = 2.hours
  # The price a review mentions is a "typical" one from this far back.
  PRICE_WINDOW = 180.days

  belongs_to :user
  belongs_to :shop
  has_one :stamp, foreign_key: :first_check_in_id, dependent: :restrict_with_exception
  # Drawn on first request, so photos from before the variants existed work too.
  has_one_attached :photo do |attachable|
    attachable.variant :thumb, resize_to_fill: [ 320, 320 ]
    attachable.variant :full, resize_to_limit: [ 1_600, 1_600 ]
  end
  has_many :share_images, dependent: :destroy
  # Badges this visit tipped over, shown in its ceremony.
  has_many :awards, dependent: :nullify
  # Friends' reactions from the feed.
  has_many :reactions, class_name: "CheckInReaction", dependent: :delete_all

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
  validates :price_birr, numericality: { only_integer: true, in: 1..5000 }, allow_nil: true
  validate :acceptable_tags
  validate :acceptable_photo

  before_validation :tidy_saying
  # The shop's catalog entry carries its tag counts, so the apps can filter
  # by them; any visit that says or said something keeps those counts true.
  after_commit :refresh_shop_review_tags, if: -> { tags.present? || saved_change_to_tags? }

  scope :reverse_chronologically, -> { order(occurred_at: :desc, id: :desc) }
  scope :rated, -> { verified.where.not(rating: nil) }

  # What a visitor chose to say about a visit we verified. A rating alone is a
  # review; so is a note or a tag. Flagged and rejected visits say nothing in
  # public, and neither does one a moderator hid after a report. Newest first
  # by id, which the cursor pages on.
  scope :reviews, lambda {
    verified
      .where(review_hidden_at: nil)
      .where("rating IS NOT NULL OR (note IS NOT NULL AND TRIM(note) != '') OR json_array_length(tags) > 0")
      .order(id: :desc)
  }
  scope :with_notes, -> { where("note IS NOT NULL AND TRIM(note) != ''") }
  scope :with_photos, -> { joins(:photo_attachment) }

  # The friends feed: verified visits by this person's friends who share
  # them, over the last month. Newest first by id, which the cursor pages on.
  def self.friend_feed_for(user, now: Time.current)
    verified
      .where(user_id: user.friendships.select(:friend_id))
      .where(user_id: User.where(shares_visits: true).select(:id))
      .where(occurred_at: (now - FEED_WINDOW)..now)
      .order(id: :desc)
  end

  def self.rating_average
    average = rated.average(:rating)
    average && average.to_f.round(2)
  end

  # A shop's score counts each person once, by the latest visit they rated,
  # so a regular's tenth cup doesn't outvote ten different visitors. Hidden
  # reviews don't count.
  def self.latest_rating_per_person
    rated = verified.where(review_hidden_at: nil).where.not(rating: nil)
    rated.where(id: rated.unscope(:order).group(:user_id).select("MAX(check_ins.id)"))
  end

  # The average, how many people it covers, and how many gave each score.
  def self.rating_summary
    latest = latest_rating_per_person
    counts = latest.unscope(:order).group(:rating).count
    count = counts.values.sum
    average = count.zero? ? nil : (counts.sum { |rating, n| rating * n }.to_f / count).round(2)
    { average: average, count: count, distribution: (1..5).to_h { |rating| [ rating.to_s, counts.fetch(rating, 0) ] } }
  end

  # The tags people pick most here, most common first.
  def self.top_tags(limit: 4)
    tag_counts.first(limit).map { |tag, count| { tag: tag, count: count } }
  end

  # How many public reviews picked each tag, most common first. Only visits
  # we verified and nobody hid count, so a removed review stops vouching.
  def self.tag_counts
    counts = Hash.new(0)
    verified.where(review_hidden_at: nil).where("json_array_length(tags) > 0").pluck(:tags).each do |tags|
      Array(tags).uniq.each { |tag| counts[tag] += 1 if TAGS.include?(tag) }
    end
    counts.sort_by { |tag, count| [ -count, TAGS.index(tag) ] }.to_h
  end

  # What people paid lately, per drink: the median, so one odd price can't
  # drag it. Only drinks with a code; free-text drinks can't be grouped.
  def self.typical_prices(now: Time.current)
    verified.where(review_hidden_at: nil, drink: DRINKS)
      .where.not(price_birr: nil)
      .where(occurred_at: (now - PRICE_WINDOW)..now)
      .pluck(:drink, :price_birr)
      .group_by(&:first)
      .map { |drink, rows| { drink: drink, median_birr: median(rows.map(&:last)), count: rows.size } }
      .sort_by { |row| [ -row[:count], DRINKS.index(row[:drink]) ] }
  end

  def self.median(values)
    sorted = values.sort
    middle = sorted.size / 2
    sorted.size.odd? ? sorted[middle] : ((sorted[middle - 1] + sorted[middle]) / 2.0).round
  end

  def self.record!(user:, shop:, idempotency_key:, latitude:, longitude:, accuracy_meters:, mock_location: false, drink: nil, rating: nil, note: nil, photo: nil, price_birr: nil, tags: nil)
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
        note: note,
        price_birr: price_birr,
        tags: tags || []
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
    return [ :rejected, "cooldown" ] if user.check_ins.where(shop: shop).where.not(status: :rejected)
      .where("occurred_at > ?", SHOP_COOLDOWN.ago).exists?
    return [ :rejected, "daily_limit" ] if user.check_ins.where(created_at: Time.current.all_day).count >= DAILY_LIMIT
    return [ :flagged, "implausible_travel" ] if implausible_travel?(user, occurred_at, latitude, longitude)
    return [ :flagged, "mock_location" ] if ActiveModel::Type::Boolean.new.cast(mock_location)
    return [ :flagged, "new_account_velocity" ] if user.created_at >= 1.hour.ago && user.check_ins.where(created_at: 1.hour.ago..).count >= NEW_ACCOUNT_LIMIT

    [ :verified, nil ]
  end

  # A price said, changed, unsaid, hidden or reinstated can move the shop's
  # price band.
  after_commit :refresh_shop_price_band, if: :price_report_changed?

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

    stamp = nil
    transaction do
      user.increment!(:verified_check_ins_count)
      shop.increment!(:check_ins_count)
      earn_stamp!
      stamp = count_toward_stamp_level!
      update!(verified_at: Time.current, counted_at: Time.current)
    end

    # Now rather than in a job, so the check-in's own response can carry them.
    Badge.evaluate_for(user, check_in: self)
    EvaluateTrustJob.perform_later(user)
    notify_stamp(stamp)
    schedule_review_prompt
  end

  # Telegram accounts that started the bot get one "how was it?" a while
  # after a visit nobody said anything about. The job checks again when it
  # runs, since the ceremony usually asks first.
  def schedule_review_prompt
    return if said_anything? || !user.bot_chat?

    SendReviewPromptJob.set(wait: REVIEW_PROMPT_DELAY).perform_later(self)
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

  # Every counted visit raises the stamp's level, including the first. Guarded
  # by counted_at in the caller, so a replay cannot inflate it.
  def count_toward_stamp_level!
    user.stamps.find_by(shop: shop)&.increment!(:check_ins_count)
  end

  # Only Telegram accounts that started the bot hear about it, and only when
  # this visit reached a level; the count is taken now because the stamp can
  # move on before the job runs.
  def notify_stamp(stamp)
    return unless stamp && user.bot_chat? && Stamp.level_reached_at(stamp.check_ins_count)

    SendStampNotificationJob.perform_later(stamp, stamp.check_ins_count)
  end

  # The stamp level this visit took the shop to, or nil when it reached none
  # (the first visit reaches bronze). Counted from the visits before it, so
  # the answer doesn't drift as later visits raise the stamp.
  def level_reached
    return unless counted_at

    visits = user.check_ins.where(shop_id: shop_id).where.not(counted_at: nil).where(counted_at: ..counted_at).count
    Stamp.level_reached_at(visits)
  end

  # Anything said about this visit at all: what makes it a review.
  def said_anything?
    rating.present? || note.present? || tags.present?
  end

  # A visit the bot may still ask about: counted, nothing said, not asked
  # before, and young enough that an answer can still be saved.
  def review_promptable?
    verified? && !said_anything? && review_prompted_at.nil? && open_for_saying?
  end

  def open_for_saying?
    occurred_at > SAYING_WINDOW.ago
  end

  def public_status
    rejected? ? "rejected" : "accepted"
  end

  # True only for the visit that created the stamp, so a repeat visit and an
  # idempotent replay both report the same answer.
  def earned_stamp?
    stamp.present?
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
    def price_report_changed?
      (price_birr.present? || price_birr_previously_was.present?) &&
        (%w[price_birr drink review_hidden_at status] & previous_changes.keys).any?
    end

    def refresh_shop_price_band
      RefreshPriceBandsJob.perform_later(shop)
    end

    def refresh_shop_review_tags
      shop.refresh_review_tags!
    end

    # Blank notes are nothing said; tags arrive as a list from forms and JSON.
    def tidy_saying
      self.note = note.strip.presence if note
      self.tags = Array(tags).compact_blank.map(&:to_s).uniq
    end

    def acceptable_tags
      errors.add(:tags, :inclusion) if (tags - TAGS).any?
      errors.add(:tags, :too_long, count: MAX_TAGS) if tags.size > MAX_TAGS
    end

    def acceptable_photo
      acceptable_image(photo, required: false)
    end
end
