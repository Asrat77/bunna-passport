class Console::UsersController < Console::BaseController
  before_action :set_user, only: %i[ show update ]

  def index
    @users = User.order(created_at: :desc)
    @users = @users.where(trust_level: params[:trust_level]) if params[:trust_level].present?
  end

  def show
  end

  def update
    @user.update!(params.expect(user: [ :trust_level ]))
    redirect_to console_user_path(@user), notice: "Trust level updated."
  end

  private
    def set_user
      @user = User.find(params[:id])
    end
end
