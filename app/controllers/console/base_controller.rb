class Console::BaseController < ApplicationController
  before_action :require_moderator

  private
    def require_moderator
      head :forbidden unless Current.user&.moderator?
    end
end
