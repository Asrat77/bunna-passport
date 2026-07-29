class Shop::Submission < ApplicationRecord
  include Locatable

  has_one :contribution, as: :contributable, touch: true
  belongs_to :neighborhood
  belongs_to :created_shop, class_name: "Shop", optional: true

  enum :price_band, {
    budget: "budget",
    standard: "standard",
    premium: "premium",
    splurge: "splurge"
  }, validate: { allow_nil: true }

  normalizes :name, :name_am, :landmark, with: ->(value) { value.strip }

  validates :name, :name_am, :landmark, presence: true
  validate :hours_are_valid

  def duplicate_candidates
    Shop.duplicate_candidates(
      name: name,
      name_am: name_am,
      latitude: latitude,
      longitude: longitude
    )
  end

  def apply!(contributor:, reviewer:)
    shop = Shop.create!(
      name: name,
      name_am: name_am,
      neighborhood: neighborhood,
      landmark: landmark,
      latitude: latitude,
      longitude: longitude,
      price_band: price_band,
      amenities: amenities,
      submitted_by: contributor,
      status: :live
    )
    if hours.present?
      shop.create_hours!(
        schedule: hours,
        confirmed_by: reviewer,
        confirmed_at: Time.current
      )
    end
    update!(created_shop: shop)
  end

  def revert!
    created_shop&.update!(status: :hidden)
  end

  private
    def hours_are_valid
      candidate = Shop::Hours.new(schedule: hours)
      candidate.valid?
      errors.add(:hours, candidate.errors[:schedule].to_sentence) if candidate.errors[:schedule].any?
    end
end
