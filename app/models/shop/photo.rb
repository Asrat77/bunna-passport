class Shop::Photo < ApplicationRecord
  include ImageAttachable

  belongs_to :shop, touch: true
  belongs_to :contributor, class_name: "User"
  has_one_attached :image do |attachable|
    attachable.variant :thumb, resize_to_fill: [ 160, 160 ], preprocessed: true
    attachable.variant :medium, resize_to_limit: [ 800, 800 ], preprocessed: true
    attachable.variant :full, resize_to_limit: [ 2_000, 2_000 ], preprocessed: true
  end

  validates :caption, length: { maximum: 240 }
  validate :acceptable_image

  private
    def acceptable_image
      super(image)
    end
end
