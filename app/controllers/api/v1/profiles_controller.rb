class Api::V1::ProfilesController < Api::V1::BaseController
  def show
    render_data(user_json(Current.user))
  end
end
