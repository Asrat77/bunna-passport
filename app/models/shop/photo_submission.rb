class Shop::PhotoSubmission < ApplicationRecord
  include ImageAttachable

  belongs_to :shop, touch: true
  belongs_to :approved_photo, class_name: "Shop::Photo", optional: true
  has_one :contribution, as: :contributable, touch: true
  has_one_attached :image

  validates :caption, length: { maximum: 240 }
  validate :acceptable_image

  def apply!(contributor:, reviewer:)
    photo = shop.photos.build(contributor: contributor, caption: caption)
    photo.image.attach(image.blob)
    photo.save!
    update!(approved_photo: photo)
  end

  def revert!
    approved_photo&.destroy!
    update!(approved_photo: nil)
  end

  private
    def acceptable_image
      super(image)
    end
end
