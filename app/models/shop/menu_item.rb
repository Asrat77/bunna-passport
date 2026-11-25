# One line of a café's menu: a drink or a dish, in English and Amharic, with
# its price in birr. Shown on the café's page in the Mini App, grouped by
# category in CATEGORIES order, then by position.
class Shop::MenuItem < ApplicationRecord
  CATEGORIES = %w[ coffee tea drinks food sweets ].freeze

  # The shop's updated_at moves with its menu, so cached pages refresh.
  belongs_to :shop, touch: true

  normalizes :name, :name_am, with: ->(value) { value.strip.presence }

  validates :name, presence: true, length: { maximum: 80 }
  validates :name_am, length: { maximum: 80 }
  validates :category, inclusion: { in: CATEGORIES }
  validates :price_birr, numericality: { only_integer: true, in: 1..100_000 }, allow_nil: true
  validates :position, numericality: { only_integer: true }

  scope :available, -> { where(available: true) }
  scope :in_menu_order, -> { in_order_of(:category, CATEGORIES).order(:position, :name, :id) }

  # Where a new item goes: after the last one in its category.
  def self.next_position(shop, category)
    shop.menu_items.where(category: category).maximum(:position).to_i + 1
  end
end
