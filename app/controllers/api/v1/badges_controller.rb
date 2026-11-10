class Api::V1::BadgesController < Api::V1::BaseController
  def index
    awarded = Current.user.awards.index_by(&:badge_id)
    render_data(
      Badge.in_display_order.select { |badge| badge.shown_to?(earned: awarded.key?(badge.id)) }.map do |badge|
        badge_json(badge, earned_at: awarded[badge.id]&.earned_at, progress: badge.progress_for(Current.user))
      end
    )
  end
end
