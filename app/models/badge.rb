class Badge < ApplicationRecord
  has_many :awards, dependent: :destroy
  has_many :users, through: :awards

  validates :slug, :name, :description, :artwork_key, :criterion, presence: true
  validates :slug, uniqueness: true
  validates :threshold, numericality: { only_integer: true, greater_than: 0 }

  scope :alphabetically, -> { order(:name) }

  def earned_by?(user)
    progress_for(user) >= threshold
  end

  def progress_for(user)
    case criterion
    when "verified_check_ins" then user.verified_check_ins_count
    when "unique_shops" then user.stamps_count
    when "approved_contributions" then user.contributions.accepted.count
    else 0
    end
  end

  def award_to!(user)
    return unless earned_by?(user)

    user.awards.create_or_find_by!(badge: self) { |award| award.earned_at = Time.current }
  end

  def self.evaluate_for(user)
    find_each { |badge| badge.award_to!(user) }
  end
end
