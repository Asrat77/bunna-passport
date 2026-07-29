class Api::V1::BadgesController < Api::V1::BaseController
  def index
    awarded = Current.user.awards.index_by(&:badge_id)
    render_data(
      Badge.alphabetically.map do |badge|
        {
          id: badge.id,
          slug: badge.slug,
          name: badge.name,
          description: badge.description,
          artwork_key: badge.artwork_key,
          tier: badge.tier,
          progress: badge.progress_for(Current.user),
          threshold: badge.threshold,
          earned_at: awarded[badge.id]&.earned_at&.iso8601
        }
      end
    )
  end
end
