class User < ApplicationRecord
  has_secure_password

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

  validates :email_address, presence: true, uniqueness: { case_sensitive: false }
  validates :handle,
    presence: true,
    uniqueness: { case_sensitive: false },
    length: { in: 3..30 },
    format: { with: /\A[a-z0-9_]+\z/ }
  validates :display_name, presence: true, length: { maximum: 80 }

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
