# Launch checklist for a neighbourhood's catalog: cafés with no photo, a
# landmark nobody could walk to, or a likely duplicate, with the fix for each
# on the same row.
class Console::DataGapsController < Console::BaseController
  FILTERS = %w[ all photo landmark duplicate ].freeze

  def show
    @neighborhoods = Neighborhood.order(:name)
    @neighborhood = Neighborhood.find_by(id: params[:neighborhood_id]) || Neighborhood.find_by(name: "Bole") || @neighborhoods.first
    @filter = params[:filter].presence_in(FILTERS) || "all"
    @gaps = Shop::Gaps.new(@neighborhood)
    @rows = @gaps.gaps.select { |row| matches_filter?(row) }
  end

  private
    def matches_filter?(row)
      case @filter
      when "photo" then row.missing_photo
      when "landmark" then row.weak_landmark
      when "duplicate" then row.duplicates.any?
      else true
      end
    end
end
