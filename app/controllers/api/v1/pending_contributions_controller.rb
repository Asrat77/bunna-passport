class Api::V1::PendingContributionsController < Api::V1::BaseController
  def show
    return render_error(:forbidden, "forbidden", "Curator access is required") unless Current.user.can_review?

    contributions = cursor_scope(Contribution.pending.where.not(user: Current.user).reverse_chronologically.includes(:confirmations))
    render_data(
      contributions.map { |contribution| contribution_json(contribution) },
      meta: { next_cursor: contributions.last&.id }
    )
  end
end
