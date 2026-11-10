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
  has_many :friendships, dependent: :delete_all
  has_many :friends, through: :friendships
  has_many :inverse_friendships, class_name: "Friendship", foreign_key: :friend_id, dependent: :delete_all
  has_many :check_in_reactions, dependent: :delete_all
  belongs_to :home_neighborhood, class_name: "Neighborhood", optional: true
  has_one_attached :avatar

  normalizes :email_address, with: ->(e) { e.strip.downcase }
  normalizes :handle, with: ->(handle) { handle.strip.downcase.delete_prefix("@") }
  normalizes :display_name, with: ->(name) { name.strip }

  # Languages the bot can write in. Anything else gets English.
  LANGUAGES = %w[en am].freeze
  validates :language, inclusion: { in: LANGUAGES }, allow_nil: true

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
  validate :avatar_traits_are_known, if: -> { avatar_traits.present? }
  before_validation :upgrade_avatar_traits, if: -> { avatar_traits.present? }
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

    # People the bot may nudge today: they started it, kept nudges on, and
    # haven't been nudged this coffee day. Whether they had a cup is checked
    # separately, in one query for the lot.
    def nudgeable(now = Time.current)
      where.not(telegram_user_id: nil).where.not(telegram_chat_started_at: nil).where(daily_nudges: true)
        .where("last_nudged_at IS NULL OR last_nudged_at < ?", coffee_day_start(now))
    end

    # People the bot may send the evening friends round-up to: they started
    # it, kept friend updates on, and haven't had one this coffee day.
    def friend_digestable(now = Time.current)
      where.not(telegram_user_id: nil).where.not(telegram_chat_started_at: nil).where(friend_updates: true)
        .where("last_friend_digest_at IS NULL OR last_friend_digest_at < ?", coffee_day_start(now))
    end

    # Finds or creates the account behind a verified Telegram user.
    # `signup_source` is kept only when this makes the account: the first
    # link that brought someone in is the one that counts.
    def from_telegram!(telegram_user, signup_source: nil)
      telegram_id = Integer(telegram_user.fetch("id"))
      user = find_by(telegram_user_id: telegram_id) || create!(
        telegram_user_id: telegram_id,
        handle: available_handle(telegram_user["username"], telegram_id),
        display_name: telegram_display_name(telegram_user, telegram_id),
        signup_source: signup_source
      )
      user.adopt_telegram_language(telegram_user["language_code"])
      user
    rescue ActiveRecord::RecordNotUnique
      find_by!(telegram_user_id: telegram_id)
    end

    # "am", "am-ET" and the like read as Amharic; any other code as English.
    def language_from_telegram(code)
      code.to_s.downcase.start_with?("am") ? "am" : "en"
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

  # The seed the Mini App draws your own profile picture from (web/src/data/me.ts).
  def avatar_seed_or_default
    avatar_seed.presence || telegram_user_id&.to_s || id.to_s
  end

  # Changes whenever the face on this person's share cards would, so a stored
  # card is drawn again after they edit their profile picture.
  def avatar_digest
    Digest::SHA256.hexdigest([ avatar_seed_or_default, Avatar.clean(avatar_traits).sort.to_h ].to_json)[0, 16]
  end

  # Whether the bot may write to this person: they started it and haven't
  # blocked it since.
  def bot_chat?
    telegram_user_id.present? && telegram_chat_started_at.present?
  end

  # The locale the bot writes to this person in.
  def bot_locale
    language == "am" ? :am : :en
  end

  # Takes the Telegram app's language until we know better. Once set, only
  # the Mini App's language switch changes it (it reports what's on screen).
  def adopt_telegram_language(code)
    update_column(:language, self.class.language_from_telegram(code)) if language.nil? && code.present?
  end

  def start_bot_chat!
    update!(telegram_chat_started_at: Time.current) unless telegram_chat_started_at
  end

  def stop_bot_chat!
    update!(telegram_chat_started_at: nil)
  end

  def had_cup_today?(now = Time.current)
    self.class.ids_with_cup_today([ id ], now: now).include?(id)
  end

  # What friends may see on a board: nil once someone has opted out.
  def public_cup_status(cup_today_ids)
    shares_cup_status? ? cup_today_ids.include?(id) : nil
  end

  # Everyone on this person's friends board: their friends and themselves.
  def friend_ids_with_self
    friendships.pluck(:friend_id) << id
  end

  # The key in this person's invite link, made the first time they ask.
  def invite_token!
    return invite_token if invite_token.present?

    update!(invite_token: SecureRandom.base58(16))
    invite_token
  rescue ActiveRecord::RecordNotUnique
    retry
  end

  # Revokes the old link, for one that reached people it shouldn't have.
  def rotate_invite_token!
    update!(invite_token: nil)
    invite_token!
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

  private
    # A face saved with a retired option (pencil-only hair) keeps saving.
    def upgrade_avatar_traits
      upgraded = Avatar.upgrade(avatar_traits)
      self.avatar_traits = upgraded unless upgraded == avatar_traits
    end

    def avatar_traits_are_known
      problem = Avatar.problems(avatar_traits)
      errors.add(:avatar_traits, problem) if problem
    end
end
