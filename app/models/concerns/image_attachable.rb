module ImageAttachable
  extend ActiveSupport::Concern

  IMAGE_CONTENT_TYPES = %w[ image/jpeg image/png image/webp ].freeze
  IMAGE_SIZE_LIMIT = 10.megabytes

  private
    def acceptable_image(attachment, required: true)
      unless attachment.attached?
        errors.add(attachment.name, "must be attached") if required
        return
      end

      errors.add(attachment.name, "must be JPEG, PNG, or WebP") unless attachment.content_type.in?(IMAGE_CONTENT_TYPES)
      errors.add(attachment.name, "must be 10 MB or smaller") if attachment.byte_size > IMAGE_SIZE_LIMIT
    end
end
