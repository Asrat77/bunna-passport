class Console::ContributionsController < Console::BaseController
  FILTERS = %w[ pending approved rejected all ].freeze

  def index
    @filter = FILTERS.include?(params[:status]) ? params[:status] : "pending"
    @counts = Contribution.group(:status).count
    @contributions = Contribution
      .includes(:user, :reviewed_by, :confirmations, :contributable)
      .reverse_chronologically
    @contributions = @contributions.where(status: @filter) unless @filter == "all"
    # The queue reads oldest first, since those have waited longest.
    @contributions = @contributions.reorder(:created_at) if @filter == "pending"
  end

  def show
    @contribution = Contribution.includes(:user, :reviewed_by, :confirmations, :contributable).find(params[:id])
    @contributor = @contribution.user
    @history = @contributor.contributions.group(:status).count
    @next_pending = Contribution.pending.where.not(id: @contribution.id).order(:created_at).first
  end
end
