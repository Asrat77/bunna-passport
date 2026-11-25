# A café's menu, edited a line at a time. Each row saves on its own; the form
# at the bottom adds a line.
class Console::Shops::MenuItemsController < Console::BaseController
  before_action :set_shop
  before_action :set_item, only: %i[ update destroy ]

  def index
    @items = @shop.menu_items.in_menu_order
    @item = @shop.menu_items.new(category: params[:category].presence_in(Shop::MenuItem::CATEGORIES) || "coffee")
  end

  def create
    @item = @shop.menu_items.new(item_params)
    @item.position = Shop::MenuItem.next_position(@shop, @item.category) if params.dig(:shop_menu_item, :position).blank?
    if @item.save
      redirect_to console_shop_menu_items_path(@shop, category: @item.category), notice: "Added #{@item.name}."
    else
      @items = @shop.menu_items.in_menu_order
      render :index, status: :unprocessable_entity
    end
  end

  def update
    if @item.update(item_params)
      redirect_to console_shop_menu_items_path(@shop), notice: "Saved #{@item.name}."
    else
      redirect_to console_shop_menu_items_path(@shop), alert: "#{@item.name_was}: #{@item.errors.full_messages.to_sentence}"
    end
  end

  def destroy
    @item.destroy!
    redirect_to console_shop_menu_items_path(@shop), notice: "Removed #{@item.name}."
  end

  private
    def set_shop
      @shop = Shop.find(params[:shop_id])
    end

    def set_item
      @item = @shop.menu_items.find(params[:id])
    end

    def item_params
      params.expect(shop_menu_item: %i[ name name_am price_birr category position available ])
    end
end
