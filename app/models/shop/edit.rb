class Shop::Edit < ApplicationRecord
  EDITABLE_ATTRIBUTES = %w[
    name name_am neighborhood_id landmark latitude longitude price_band amenities hours
  ].freeze

  belongs_to :shop, touch: true
  has_one :contribution, as: :contributable, touch: true

  validate :changes_are_supported
  validate :hours_are_valid

  def apply!(contributor:, reviewer:)
    changes = proposed_changes.to_h.stringify_keys
    shop_changes = changes.except("hours")
    self.previous_values = shop.attributes.slice(*shop_changes.keys)

    if changes.key?("hours")
      previous_values["hours"] = shop.hours&.schedule
      shop.hours&.destroy!
      shop.create_hours!(
        schedule: changes["hours"],
        confirmed_by: reviewer,
        confirmed_at: Time.current
      )
    end

    shop.update!(shop_changes)
    save!
  end

  def revert!
    values = previous_values.to_h.stringify_keys
    previous_hours = values.delete("hours")
    shop.update!(values)

    if previous_values.key?("hours")
      shop.hours&.destroy!
      shop.create_hours!(
        schedule: previous_hours || {},
        confirmed_by: contribution.reviewed_by,
        confirmed_at: Time.current
      ) if previous_hours
    end
  end

  private
    def changes_are_supported
      changes = proposed_changes.to_h.stringify_keys
      unsupported = changes.keys - EDITABLE_ATTRIBUTES
      errors.add(:proposed_changes, "must contain at least one field") if changes.empty?
      errors.add(:proposed_changes, "contains unsupported fields: #{unsupported.join(", ")}") if unsupported.any?
    end

    def hours_are_valid
      changes = proposed_changes.to_h.stringify_keys
      return unless changes.key?("hours")

      candidate = Shop::Hours.new(schedule: changes["hours"])
      candidate.valid?
      errors.add(:proposed_changes, candidate.errors[:schedule].to_sentence) if candidate.errors[:schedule].any?
    end
end
