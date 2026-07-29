class Console::ShopsController < Console::BaseController
  before_action :set_shop, only: %i[ show edit update ]

  def index
    @shops = Shop.includes(:neighborhood, :hours).alphabetically
    @shops = @shops.where(status: params[:status]) if params[:status].present?
  end

  def show
  end

  def new
    @shop = Shop.new(status: :live, amenities: {})
  end

  def create
    attributes = shop_params
    @shop = Shop.new(attributes.merge(submitted_by: Current.user))
    schedule = parsed_hours
    Shop.transaction do
      @shop.save!
      save_hours!(schedule)
    end
    redirect_to console_shop_path(@shop), notice: "Shop created."
  rescue ActiveRecord::RecordInvalid, JSON::ParserError => error
    @shop.errors.add(:hours, error.message) if error.is_a?(JSON::ParserError)
    render :new, status: :unprocessable_entity
  end

  def edit
  end

  def update
    attributes = shop_params
    schedule = parsed_hours
    Shop.transaction do
      @shop.update!(attributes)
      save_hours!(schedule)
    end
    redirect_to console_shop_path(@shop), notice: "Shop updated."
  rescue ActiveRecord::RecordInvalid, JSON::ParserError => error
    @shop.errors.add(:hours, error.message) if error.is_a?(JSON::ParserError)
    render :edit, status: :unprocessable_entity
  end

  private
    def set_shop
      @shop = Shop.find(params[:id])
    end

    def shop_params
      values = params.expect(shop: [
        :name, :name_am, :neighborhood_id, :landmark, :latitude, :longitude,
        :status, :price_band, :hours_json, { amenities: {} }
      ])
      amenities = values.delete(:amenities).to_h.slice(*Shop::AMENITIES)
        .transform_values { |value| ActiveModel::Type::Boolean.new.cast(value) }
      @hours_json = values.delete(:hours_json)
      values.merge(amenities: amenities)
    end

    def parsed_hours
      JSON.parse(@hours_json) if @hours_json.present?
    end

    def save_hours!(schedule)
      return unless schedule

      hours = @shop.hours || @shop.build_hours
      hours.update!(schedule: schedule, confirmed_by: Current.user, confirmed_at: Time.current)
    end
end
