# A café's menu as its owner keeps it from the Mini App. Moderators can use
# it too; everyone else reads the menu on the café's page.
class Api::V1::MenuItemsController < Api::V1::BaseController
  before_action :set_shop
  before_action :require_menu_editor
  before_action :set_item, only: %i[ update destroy ]

  # Every line, switched off ones too, for the owner's editor.
  def index
    render_data(@shop.menu_items.in_menu_order.map { |item| editable_menu_item_json(item) })
  end

  def create
    item = @shop.menu_items.new(item_params)
    item.position = Shop::MenuItem.next_position(@shop, item.category) unless item_params.key?(:position)
    item.save!
    render_data(editable_menu_item_json(item), status: :created)
  end

  def update
    @item.update!(item_params)
    render_data(editable_menu_item_json(@item))
  end

  def destroy
    @item.destroy!
    head :no_content
  end

  private
    def set_shop
      @shop = Shop.live.find(params[:shop_id])
    end

    def require_menu_editor
      render_error(:forbidden, "forbidden", "Only the café's owner can change its menu") unless Current.user.can_edit_menu?(@shop)
    end

    def set_item
      @item = @shop.menu_items.find(params[:id])
    end

    def item_params
      params.expect(menu_item: %i[ name name_am price_birr category position available ])
    end

    def editable_menu_item_json(item)
      menu_item_json(item).merge(position: item.position, available: item.available)
    end
end
