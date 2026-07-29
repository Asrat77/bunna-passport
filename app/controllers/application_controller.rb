class ApplicationController < ActionController::Base
  include Authentication
  before_action :set_current_request

  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  # Changes to the importmap will invalidate the etag for HTML responses
  stale_when_importmap_changes

  private
    def set_current_request
      Current.request_id = request.request_id
      Current.ip_address = request.remote_ip
      Current.user_agent = request.user_agent
    end
end
