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

  FIRST_STAMP_WITHIN = 7.days

  # The launch gate: of the people who joined in a week, how many had a
  # stamp within seven days of signing up. The week before last, because
  # everyone in it has had their full seven days by the time this is sent;
  # `so_far` is last week's newcomers, still counting.
  def first_stamps
    @first_stamps ||= {
      cohort: first_stamp_counts(previous_week),
      so_far: first_stamp_counts(week)
    }
  end

  # Where last week's newcomers came from (LaunchLink), most first, as
  # [label, count]. Stickers show as their café's name; untagged signups as
  # "direct".
  def signup_sources
    @signup_sources ||= begin
      counts = User.where(created_at: week).group(:signup_source).count
      cafes = Shop.where(id: counts.keys.filter_map { |source| LaunchLink.sticker_shop_id(source) }).pluck(:id, :name).to_h
      counts.map do |source, count|
        label = if source.nil? then "direct"
        elsif (name = cafes[LaunchLink.sticker_shop_id(source)]) then "#{name} sticker"
        else source
        end
        [ label, count ]
      end.sort_by { |label, count| [ -count, label ] }
    end
  end

  private
    def first_stamp_counts(range)
      joined = User.where(created_at: range).pluck(:id, :created_at).to_h
      firsts = Stamp.where(user_id: joined.keys).group(:user_id).minimum(:earned_at)
      stamped = firsts.count { |user_id, earned_at| earned_at <= joined.fetch(user_id) + FIRST_STAMP_WITHIN }
      { joined: joined.size, stamped: stamped }
    end

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
