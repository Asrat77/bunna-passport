class Contribution < ApplicationRecord
  delegated_type :contributable, types: %w[
    Shop::Submission
    Shop::Edit
    Shop::PhotoSubmission
  ], dependent: :destroy

  belongs_to :user
  belongs_to :reviewed_by, class_name: "User", optional: true
  has_many :confirmations, class_name: "Contribution::Confirmation", dependent: :destroy

  enum :status, {
    pending: "pending",
    approved: "approved",
    rejected: "rejected",
    auto_approved: "auto_approved"
  }, default: :pending, validate: true

  validates :rejection_reason, presence: true, if: :rejected?

  scope :reverse_chronologically, -> { order(created_at: :desc) }
  scope :accepted, -> { where(status: %w[ approved auto_approved ]) }

  def self.record!(user:, contributable:)
    raise DailyLimitExceeded if user.contributions.where(created_at: Time.current.all_day).count >= user.submission_limit

    transaction do
      contribution = create!(user: user, contributable: contributable)
      contribution.approve!(reviewer: user, automatically: true) if contribution.auto_approvable?
      contribution
    end
  end

  def approve!(reviewer:, automatically: false)
    raise AlreadyReviewed unless pending?
    raise NotAuthorized unless automatically || reviewer&.can_review?

    transaction do
      contributable.apply!(contributor: user, reviewer: reviewer)
      update!(
        status: automatically ? :auto_approved : :approved,
        reviewed_by: reviewer,
        reviewed_at: Time.current,
        rejection_reason: nil
      )
    end

    EvaluateTrustJob.perform_later(user)
    AwardBadgesJob.perform_later(user)
    self
  end

  def reject!(reviewer:, reason:)
    raise AlreadyReviewed unless pending?
    raise NotAuthorized unless reviewer&.can_review?

    update!(
      status: :rejected,
      reviewed_by: reviewer,
      reviewed_at: Time.current,
      rejection_reason: reason
    )
  end

  def confirm!(by:)
    with_lock do
      raise NotAuthorized unless confirmable_by?(by)

      confirmations.create!(user: by)
      approve!(reviewer: by) if shop_submission? && confirmations.count >= 2
    end
    self
  end

  def reverse!(by:)
    raise NotAuthorized unless by&.moderator?
    raise AlreadyPending if pending?

    transaction do
      contributable.revert! if accepted?
      confirmations.destroy_all
      update!(status: :pending, reviewed_by: nil, reviewed_at: nil, rejection_reason: nil)
    end
  end

  def accepted?
    approved? || auto_approved?
  end

  def confirmable_by?(candidate)
    pending? &&
      candidate&.can_review? &&
      candidate != user &&
      !confirmations.exists?(user: candidate)
  end

  def auto_approvable?
    return false if shop_submission? && contributable.duplicate_override?
    return true if user.curator? || user.moderator?

    user.regular? && shop_edit?
  end

  class DailyLimitExceeded < StandardError; end
  class AlreadyReviewed < StandardError; end
  class AlreadyPending < StandardError; end
  class NotAuthorized < StandardError; end
end
