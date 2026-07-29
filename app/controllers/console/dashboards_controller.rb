class Console::DashboardsController < Console::BaseController
  def show
    @pending_contributions = Contribution.pending.reverse_chronologically.limit(8)
    @pending_reports = Report.pending.reverse_chronologically.limit(8)
    @flagged_check_ins = CheckIn.flagged.reverse_chronologically.limit(8)
    @metrics = {
      live_shops: Shop.live.count,
      stale_hours: Shop.live.left_joins(:hours)
        .where("shop_hours.id IS NULL OR shop_hours.confirmed_at < ?", Shop::Hours::FRESH_FOR.ago)
        .count,
      pending_contributions: Contribution.pending.count,
      pending_reports: Report.pending.count,
      flagged_check_ins: CheckIn.flagged.count,
      verified_ratio: verified_ratio
    }
  end

  private
    def verified_ratio
      decided = CheckIn.where(status: %w[ verified flagged ]).count
      return 0 if decided.zero?

      (CheckIn.verified.count.fdiv(decided) * 100).round(1)
    end
end
