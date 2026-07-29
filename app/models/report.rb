class Report < ApplicationRecord
  belongs_to :user
  belongs_to :reportable, polymorphic: true
  belongs_to :reviewed_by, class_name: "User", optional: true

  enum :reason, {
    closed: "closed",
    duplicate: "duplicate",
    wrong_location: "wrong_location",
    inaccurate_details: "inaccurate_details",
    inappropriate: "inappropriate",
    spam: "spam",
    other: "other"
  }, validate: true

  enum :status, {
    pending: "pending",
    upheld: "upheld",
    dismissed: "dismissed"
  }, default: :pending, validate: true

  validates :note, length: { maximum: 1_000 }

  scope :reverse_chronologically, -> { order(created_at: :desc) }

  def uphold!(by:)
    raise NotAuthorized unless by&.moderator?
    raise AlreadyReviewed unless pending?

    transaction do
      update!(status: :upheld, reviewed_by: by, reviewed_at: Time.current)
      reported_user&.update!(trust_level: :newcomer)
    end
  end

  def dismiss!(by:)
    raise NotAuthorized unless by&.moderator?
    raise AlreadyReviewed unless pending?

    update!(status: :dismissed, reviewed_by: by, reviewed_at: Time.current)
  end

  def reverse!(by:)
    raise NotAuthorized unless by&.moderator?
    raise AlreadyPending if pending?

    update!(status: :pending, reviewed_by: nil, reviewed_at: nil)
  end

  def reported_user
    case reportable
    when User then reportable
    when Shop then reportable.submitted_by
    when Contribution then reportable.user
    when CheckIn then reportable.user
    when Shop::Photo then reportable.contributor
    end
  end

  class NotAuthorized < StandardError; end
  class AlreadyReviewed < StandardError; end
  class AlreadyPending < StandardError; end
end
