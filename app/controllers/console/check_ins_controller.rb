class Console::CheckInsController < Console::BaseController
  def index
    @check_ins = CheckIn.includes(:user, :shop).reverse_chronologically
    @check_ins = @check_ins.where(status: params.fetch(:status, "flagged"))
  end

  def show
    @check_in = CheckIn.includes(:user, :shop).find(params[:id])
  end
end
