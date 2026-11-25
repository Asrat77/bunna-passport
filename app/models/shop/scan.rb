# A Mini App open from a link that named this café: its QR stand, or one of
# the first counter stickers. Recorded when Telegram's signed launch data
# arrives (Api::V1::TelegramSessionsController), so it can't be forged from
# the client. It only says who opened the café's page and when; the GPS
# rules for checking in are the same as for anyone else.
class Shop::Scan < ApplicationRecord
  # A verified check-in this soon after the scan, by the same person at the
  # same café, counts as the scan turning into a visit.
  CHECK_IN_WITHIN = 3.hours

  belongs_to :shop
  belongs_to :user

  scope :between, ->(range) { where(opened_at: range) }
  scope :first_opens, -> { where(first_open: true) }

  # Once per launch: Telegram signs the same auth_date into every reload of
  # it, so the second write finds the first.
  def self.record!(shop:, user:, opened_at:, first_open:)
    create_with(first_open: first_open).find_or_create_by!(shop: shop, user: user, opened_at: opened_at)
  rescue ActiveRecord::RecordNotUnique
    find_by!(shop: shop, user: user, opened_at: opened_at)
  end

  # How the scans in `range` went, per café: scans, how many became a
  # verified check-in there within CHECK_IN_WITHIN, and how many made a new
  # account. { shop_id => { scans:, check_ins:, signups: } }
  def self.funnel(range)
    scans = between(range).pluck(:id, :shop_id, :user_id, :opened_at, :first_open)
    return {} if scans.empty?

    visits = CheckIn.verified
      .where(shop_id: scans.map(&:second).uniq, user_id: scans.map(&:third).uniq)
      .where(occurred_at: range.begin..(range.end + CHECK_IN_WITHIN))
      .pluck(:shop_id, :user_id, :occurred_at)
      .group_by { |shop_id, user_id, _| [ shop_id, user_id ] }

    scans.group_by(&:second).transform_values do |rows|
      {
        scans: rows.size,
        check_ins: rows.count do |_, shop_id, user_id, opened_at, _|
          visits.fetch([ shop_id, user_id ], []).any? { |*, at| at >= opened_at && at <= opened_at + CHECK_IN_WITHIN }
        end,
        signups: rows.count(&:last)
      }
    end
  end
end
