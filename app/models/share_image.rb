# A rendered ShareCard kept in storage (R2 in production) so sharing the same
# card again costs nothing. Rendered on the first share, never ahead of it,
# and re-rendered when ShareCard::VERSION changes.
class ShareImage < ApplicationRecord
  belongs_to :check_in
  has_one_attached :png
  has_secure_token :token, length: 24

  validates :format, inclusion: { in: ShareCard::FORMATS.keys }

  def self.for!(check_in, format:, doodle: true)
    image = find_or_initialize_by(check_in: check_in, format: format.to_s, doodle: doodle)
    image.render! if image.stale?
    image
  rescue ActiveRecord::RecordNotUnique
    # Two taps raced to render the same card; the other one won.
    find_by!(check_in: check_in, format: format.to_s, doodle: doodle)
  end

  def stale?
    new_record? || version != ShareCard::VERSION || !png.attached?
  end

  def render!
    card = ShareCard.new(check_in, format: format, doodle: doodle)
    self.version = ShareCard::VERSION
    png.attach(io: StringIO.new(card.to_png), filename: "bunna-passport-#{format}.png", content_type: "image/png")
    save!
  end
end
