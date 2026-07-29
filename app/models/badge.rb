class Badge < ApplicationRecord
  DEFAULTS = [
    {
      slug: "first-check-in",
      name: "First Cup",
      description: "Record your first verified coffee.",
      artwork_key: "first-cup",
      criterion: "verified_check_ins",
      threshold: 1
    },
    {
      slug: "five-shops",
      name: "Five Shops",
      description: "Collect stamps from five coffee shops.",
      artwork_key: "five-shops",
      criterion: "unique_shops",
      threshold: 5
    },
    {
      slug: "ten-shops",
      name: "Ten Shops",
      description: "Collect stamps from ten coffee shops.",
      artwork_key: "ten-shops",
      criterion: "unique_shops",
      threshold: 10
    },
    {
      slug: "ten-cups",
      name: "Ten Cups",
      description: "Record ten verified coffees.",
      artwork_key: "ten-cups",
      criterion: "verified_check_ins",
      threshold: 10
    },
    {
      slug: "fifty-cups",
      name: "Fifty Cups",
      description: "Record fifty verified coffees.",
      artwork_key: "fifty-cups",
      criterion: "verified_check_ins",
      threshold: 50
    },
    {
      slug: "first-contribution",
      name: "First Contribution",
      description: "Have a community contribution accepted.",
      artwork_key: "first-contribution",
      criterion: "approved_contributions",
      threshold: 1
    },
    {
      slug: "five-contributions",
      name: "Five Contributions",
      description: "Have five community contributions accepted.",
      artwork_key: "five-contributions",
      criterion: "approved_contributions",
      threshold: 5
    }
  ].freeze

  has_many :awards, dependent: :destroy
  has_many :users, through: :awards

  validates :slug, :name, :description, :artwork_key, :criterion, presence: true
  validates :slug, uniqueness: true
  validates :threshold, numericality: { only_integer: true, greater_than: 0 }

  scope :alphabetically, -> { order(:name) }

  def self.install_defaults!
    transaction do
      DEFAULTS.each do |attributes|
        find_or_initialize_by(slug: attributes.fetch(:slug)).update!(attributes)
      end
    end
  end

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
