# An owner (or manager) of a café, as Bunna Passport knows them. Asked for
# with "Claim this café" in the Mini App, which tells the moderators; a
# moderator checks with the café and approves or rejects in the console.
#
# An approved owner can change their café's photos, hours, landmark and menu
# from the Mini App without waiting for review (Contribution#auto_approvable?,
# Api::V1::MenuItemsController). Nothing else about the café changes: its
# check-ins and stamps work the same for everyone.
class ShopAccount < ApplicationRecord
  # What an owner may change on Shop::Edit without review.
  OWNER_EDITABLE = %w[ landmark hours ].freeze

  belongs_to :shop
  belongs_to :user
  belongs_to :reviewed_by, class_name: "User", optional: true

  enum :status, { pending: "pending", approved: "approved", rejected: "rejected" }, default: :pending, validate: true

  normalizes :note, with: ->(note) { note.strip.presence }
  validates :note, length: { maximum: 500 }
  validates :user_id, uniqueness: { scope: :shop_id }

  scope :reverse_chronologically, -> { order(created_at: :desc) }

  # Asks to claim the café, or asks again after a rejection. An approved or
  # still-pending request stays as it is.
  def self.request!(shop:, user:, note: nil)
    account = find_or_initialize_by(shop: shop, user: user)
    return account if account.persisted? && !account.rejected?

    account.update!(status: :pending, note: note, reviewed_by: nil, reviewed_at: nil)
    SendShopClaimJob.perform_later(account)
    account
  rescue ActiveRecord::RecordNotUnique
    find_by!(shop: shop, user: user)
  end

  def approve!(by:)
    review!(:approved, by)
  end

  def reject!(by:)
    review!(:rejected, by)
  end

  private
    def review!(status, reviewer)
      raise NotAuthorized unless reviewer&.moderator?

      update!(status: status, reviewed_by: reviewer, reviewed_at: Time.current)
      SendShopClaimDecisionJob.perform_later(self)
      self
    end

  public

  class NotAuthorized < StandardError; end
end
