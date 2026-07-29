class Contribution::Confirmation < ApplicationRecord
  self.table_name = "contribution_confirmations"

  belongs_to :contribution
  belongs_to :user

  validate :user_can_confirm

  private
    def user_can_confirm
      errors.add(:user, "cannot confirm this contribution") unless contribution&.confirmable_by?(user)
    end
end
