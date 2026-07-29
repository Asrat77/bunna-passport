class Console::ShopBatchesController < Console::BaseController
  def new
  end

  def create
    rows = JSON.parse(params.expect(:shops_json))
    raise JSON::ParserError, "Expected a JSON array" unless rows.is_a?(Array)

    created = Shop.transaction do
      rows.map do |row|
        attributes = row.slice(
          "name", "name_am", "neighborhood_id", "landmark", "latitude",
          "longitude", "price_band", "amenities"
        )
        Shop.create!(attributes.merge(status: :live, submitted_by: Current.user))
      end
    end
    redirect_to console_shops_path, notice: "#{created.size} shops created."
  rescue JSON::ParserError, ActiveRecord::RecordInvalid => error
    @error = error.message
    render :new, status: :unprocessable_entity
  end
end
