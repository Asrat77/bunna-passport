class Badge < ApplicationRecord
  DEFAULTS = [
    {
      slug: "first-check-in",
      tier: "bronze",
      name: "First Cup",
      description: "Record your first verified coffee.",
      artwork_key: "first-cup",
      criterion: "verified_check_ins",
      threshold: 1
    },
    {
      slug: "five-shops",
      tier: "silver",
      name: "Five Shops",
      description: "Collect stamps from five coffee shops.",
      artwork_key: "five-shops",
      criterion: "unique_shops",
      threshold: 5
    },
    {
      slug: "ten-shops",
      tier: "gold",
      name: "Ten Shops",
      description: "Collect stamps from ten coffee shops.",
      artwork_key: "ten-shops",
      criterion: "unique_shops",
      threshold: 10
    },
    {
      slug: "ten-cups",
      tier: "silver",
      name: "Ten Cups",
      description: "Record ten verified coffees.",
      artwork_key: "ten-cups",
      criterion: "verified_check_ins",
      threshold: 10
    },
    {
      slug: "fifty-cups",
      tier: "gold",
      name: "Fifty Cups",
      description: "Record fifty verified coffees.",
      artwork_key: "fifty-cups",
      criterion: "verified_check_ins",
      threshold: 50
    },
    {
      slug: "first-contribution",
      tier: "bronze",
      name: "First Contribution",
      description: "Have a community contribution accepted.",
      artwork_key: "first-contribution",
      criterion: "approved_contributions",
      threshold: 1
    },
    {
      slug: "five-contributions",
      tier: "silver",
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
  # Tiers are struck in the same metals as stamp levels (DESIGN.md §6.3).
  validates :tier, inclusion: { in: Stamp::LEVELS.keys }, allow_nil: true
  validate :challenge_is_complete, if: :challenge?

  CHALLENGE = "challenge_shops"

  # Cups, then stamps, then contributions, each climbing, as the shelf shows them.
  # A running challenge leads the shelf, so it's the first thing people see.
  CRITERIA_ORDER = [ CHALLENGE, *%w[ verified_check_ins unique_shops approved_contributions ] ].freeze

  def self.in_display_order
    all.sort_by { |badge| [ CRITERIA_ORDER.index(badge.criterion) || CRITERIA_ORDER.size, badge.threshold, badge.slug ] }
  end

  # Sets up a time-boxed challenge such as Bole 10: visit every café on the
  # list between the two times. Running it again with the same slug updates
  # the list or the dates; awards already given stay.
  def self.install_challenge!(slug:, name:, description:, shops:, starts_at:, ends_at:, tier: "gold")
    find_or_initialize_by(slug: slug).tap do |badge|
      badge.update!(
        name: name, description: description, tier: tier,
        artwork_key: "#{slug}-shops", criterion: CHALLENGE,
        shop_ids: shops.map(&:id), threshold: shops.size,
        starts_at: starts_at, ends_at: ends_at
      )
    end
  end

  def challenge?
    criterion == CHALLENGE
  end

  def challenge_open?(at = Time.current)
    challenge? && starts_at <= at && at < ends_at
  end

  # What belongs on someone's shelf: every standing badge, a challenge while
  # it runs, and a finished one only if they earned it. A challenge that
  # hasn't started stays a surprise.
  def shown_to?(earned:, at: Time.current)
    !challenge? || earned || challenge_open?(at)
  end

  def challenge_shops
    return Shop.none unless challenge?

    Shop.where(id: shop_ids).includes(:neighborhood)
  end

  # The challenge cafés this person has a verified visit at inside the window.
  def challenge_shop_ids_visited_by(user)
    return [] unless challenge?

    user.check_ins.verified.where(shop_id: shop_ids, occurred_at: starts_at...ends_at).distinct.pluck(:shop_id)
  end

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
    when CHALLENGE then challenge_shop_ids_visited_by(user).size
    else 0
    end
  end

  # The award, or nil when the badge isn't earned. `check_in` is the visit
  # that tipped it over, when a visit did.
  def award_to!(user, check_in: nil)
    return unless earned_by?(user)

    user.awards.create_or_find_by!(badge: self) do |award|
      award.earned_at = Time.current
      award.check_in = check_in
    end
  end

  # Awards every badge the user now qualifies for and returns only the ones
  # this call created, so a caller can celebrate exactly those.
  def self.evaluate_for(user, check_in: nil)
    find_each.filter_map do |badge|
      award = badge.award_to!(user, check_in: check_in)
      award if award&.previously_new_record?
    end
  end

  private
    def challenge_is_complete
      errors.add(:shop_ids, "must list the challenge's cafés") if Array(shop_ids).empty?
      errors.add(:threshold, "must equal the number of cafés") if threshold != Array(shop_ids).size
      errors.add(:ends_at, "must come after starts_at") unless starts_at && ends_at && ends_at > starts_at
    end
end
