class AddReferralsToUsers < ActiveRecord::Migration[8.1]
  REFERRAL_BADGES = [
    { slug: "first-referral", tier: "bronze", name: "Brought a Friend",
      description: "A friend you invited got their first stamp.", artwork_key: "first-referral",
      criterion: "referrals", threshold: 1 },
    { slug: "five-referrals", tier: "silver", name: "Coffee Host",
      description: "Five friends you invited got their first stamp.", artwork_key: "five-referrals",
      criterion: "referrals", threshold: 5 }
  ].freeze

  class MigrationBadge < ActiveRecord::Base
    self.table_name = "badges"
  end

  def up
    # Who invited someone (set when a newcomer accepts an invite, before their
    # first verified visit), and when that referral paid out: at the friend's
    # first verified check-in, so an account that never checks in earns the
    # inviter nothing.
    add_reference :users, :referred_by, foreign_key: { to_table: :users }
    add_column :users, :referral_rewarded_at, :datetime

    # The referral badges, so production has them without a reference-data run.
    REFERRAL_BADGES.each do |attributes|
      MigrationBadge.reset_column_information
      MigrationBadge.find_or_initialize_by(slug: attributes[:slug]).update!(attributes)
    end
  end

  def down
    MigrationBadge.where(slug: REFERRAL_BADGES.map { |badge| badge[:slug] }).find_each do |badge|
      execute "DELETE FROM awards WHERE badge_id = #{Integer(badge.id)}"
      badge.delete
    end
    remove_column :users, :referral_rewarded_at
    remove_reference :users, :referred_by, foreign_key: { to_table: :users }
  end
end
