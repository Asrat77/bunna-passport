# Last week's numbers for the people running Bunna, sent to them in Telegram
# every Monday morning (see SendWeeklyReportJob). A week runs Monday to
# Monday in Addis time. Each number comes with the week before it, so a
# trend shows without opening anything.
class Ops::WeeklyReport
  ZONE = User::COFFEE_DAY_ZONE

  METRICS = %i[ new_users check_ins drinkers reviews accepted_invites new_stamps ].freeze

  attr_reader :week, :previous_week

  # The last full week before `now`.
  def initialize(now: Time.current)
    starts = now.in_time_zone(ZONE).beginning_of_week - 1.week
    @week = starts...(starts + 1.week)
    @previous_week = (starts - 1.week)...starts
  end

  def this_week
    @this_week ||= counts(week)
  end

  def last_week
    @last_week ||= counts(previous_week)
  end

  def total_users
    @total_users ||= User.where(created_at: ...week.end).count
  end

  private
    def counts(range)
      cups = CheckIn.verified.where(occurred_at: range)
      {
        new_users: User.where(created_at: range).count,
        check_ins: cups.count,
        drinkers: cups.distinct.count(:user_id),
        reviews: CheckIn.reviews.unscope(:order).where(occurred_at: range).count,
        # Accepting an invite link is the only way to make a friend, and it
        # writes one row each way; count each pair once.
        accepted_invites: Friendship.where(created_at: range).where("user_id < friend_id").count,
        new_stamps: Stamp.where(earned_at: range).count
      }
    end
end
