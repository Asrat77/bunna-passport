class User < ApplicationRecord
  # The doodle wakes with the first cup of a "coffee day", which starts at
  # 04:00 in Addis so a late night still counts toward the evening before.
  COFFEE_DAY_ZONE = "Africa/Addis_Ababa"
  COFFEE_DAY_STARTS_AT = 4

  # Validations are declared below so a Telegram account can exist without a
  # password; an email account still needs one.
  has_secure_password validations: false

  has_many :sessions, dependent: :destroy
  has_many :submitted_shops, class_name: "Shop", foreign_key: :submitted_by_id, inverse_of: :submitted_by
  has_many :contributions, dependent: :restrict_with_exception
  has_many :check_ins, dependent: :restrict_with_exception
  has_many :stamps, dependent: :restrict_with_exception
  has_many :awards, dependent: :destroy
  has_many :badges, through: :awards
  has_many :reports, dependent: :restrict_with_exception
  belongs_to :home_neighborhood, class_name: "Neighborhood", optional: true
  has_one_attached :avatar

  normalizes :email_address, with: ->(e) { e.strip.downcase }
  normalizes :handle, with: ->(handle) { handle.strip.downcase.delete_prefix("@") }
  normalizes :display_name, with: ->(name) { name.strip }

  enum :trust_level, {
    newcomer: "newcomer",
    regular: "regular",
    curator: "curator",
    moderator: "moderator"
  }, default: :newcomer, validate: true

  validates :email_address, presence: true, unless: :telegram_user_id?
  validates :email_address, uniqueness: { case_sensitive: false }, allow_nil: true
  validates :password, presence: true, on: :create, if: :email_address?
  validates :password, confirmation: true, length: { maximum: ActiveModel::SecurePassword::MAX_PASSWORD_LENGTH_ALLOWED }, allow_nil: true
  validates :telegram_user_id, uniqueness: true, allow_nil: true
  validates :avatar_seed, length: { maximum: 64 }
  validates :handle,
    presence: true,
    uniqueness: { case_sensitive: false },
    length: { in: 3..30 },
    format: { with: /\A[a-z0-9_]+\z/ }
  validates :display_name, presence: true, length: { maximum: 80 }

  class << self
    def coffee_day_start(now = Time.current)
      local = now.in_time_zone(COFFEE_DAY_ZONE)
      start = local.change(hour: COFFEE_DAY_STARTS_AT)
      local < start ? start - 1.day : start
    end

    # Which of these users have had a cup this coffee day, in one query, for
    # boards that list many people. Flagged visits count: the client already
    # shows them as accepted, and a doodle that stayed asleep would give the
    # flag away.
    def ids_with_cup_today(user_ids, now: Time.current)
      CheckIn.where(user_id: user_ids).where.not(status: :rejected)
        .where(occurred_at: coffee_day_start(now)..now).distinct.pluck(:user_id).to_set
    end

    # Finds or creates the account behind a verified Telegram user.
    def from_telegram!(telegram_user)
      telegram_id = Integer(telegram_user.fetch("id"))
      find_by(telegram_user_id: telegram_id) || create!(
        telegram_user_id: telegram_id,
        handle: available_handle(telegram_user["username"], telegram_id),
        display_name: telegram_display_name(telegram_user, telegram_id)
      )
    rescue ActiveRecord::RecordNotUnique
      find_by!(telegram_user_id: telegram_id)
    end

    private
      def available_handle(username, telegram_id)
        base = username.to_s.downcase.gsub(/[^a-z0-9_]/, "")[0, 26]
        base = "tg_#{telegram_id}"[0, 26] if base.length < 3
        return base unless exists?(handle: base)

        (2..).lazy.map { |n| "#{base}_#{n}" }.find { |candidate| !exists?(handle: candidate) }
      end

      def telegram_display_name(telegram_user, telegram_id)
        name = [ telegram_user["first_name"], telegram_user["last_name"] ].compact.join(" ").strip
        (name.presence || "Telegram #{telegram_id}")[0, 80]
      end
  end

  def had_cup_today?(now = Time.current)
    self.class.ids_with_cup_today([ id ], now: now).include?(id)
  end

  # What friends may see on a board: nil once someone has opted out.
  def public_cup_status(cup_today_ids)
    shares_cup_status? ? cup_today_ids.include?(id) : nil
  end

  def can_review?
    curator? || moderator?
  end

  def can_merge_shops?
    curator? || moderator?
  end

  def submission_limit
    newcomer? ? 2 : 5
  end

  def evaluate_trust!
    return if moderator?

    next_level = case
    when reports.where(status: :upheld).exists?
      :newcomer
    when verified_check_ins_count >= 50 &&
        check_ins.verified.distinct.count(:shop_id) >= 20 &&
        contributions.accepted.count >= 5
      :curator
    when verified_check_ins_count >= 10 && check_ins.verified.distinct.count(:shop_id) >= 5
      :regular
    else
      :newcomer
    end

    update!(trust_level: next_level) unless trust_level == next_level.to_s
  end
end
