class Api::V1::ContributionsController < Api::V1::BaseController
  def index
    contributions = cursor_scope(Current.user.contributions.reverse_chronologically.includes(:confirmations))
    render_data(
      contributions.map { |contribution| contribution_json(contribution) },
      meta: { next_cursor: contributions.last&.id }
    )
  end

  def show
    contribution = Current.user.can_review? ? Contribution.find(params[:id]) : Current.user.contributions.find(params[:id])
    render_data(contribution_json(contribution))
  end
end
