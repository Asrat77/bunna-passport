class Api::V1::BaseController < ActionController::API
  include Api::V1::Rendering

  before_action :set_current_request
  before_action :authenticate

  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
  rescue_from ActiveRecord::RecordInvalid, with: :render_record_invalid
  rescue_from ActionController::BadRequest, ActionController::ParameterMissing, with: :render_bad_request
  rescue_from ArgumentError, with: :render_bad_request
  rescue_from Contribution::DailyLimitExceeded, with: :render_daily_limit
  rescue_from Contribution::NotAuthorized, Contribution::AlreadyReviewed, with: :render_forbidden
  rescue_from Shop::NotAuthorized, Report::NotAuthorized, with: :render_forbidden

  class_attribute :authentication_required, default: true

  class << self
    def allow_unauthenticated_access(**options)
      skip_before_action :authenticate, **options
    end
  end

  private
    def authenticate
      Current.session = Session.authenticate(bearer_token)
      render_error(:unauthorized, "authentication_required", "A valid bearer token is required") unless Current.session
    end

    def bearer_token
      scheme, token = request.authorization.to_s.split(" ", 2)
      token if scheme&.casecmp("Bearer")&.zero?
    end

    def set_current_request
      Current.request_id = request.request_id
      Current.ip_address = request.remote_ip
      Current.user_agent = request.user_agent
    end

    def cursor_scope(scope, limit: 50)
      scope = scope.where("id < ?", params[:cursor]) if params[:cursor].present?
      scope.limit(limit.clamp(1, 100))
    end

    def render_not_found
      render_error(:not_found, "not_found", "The requested resource was not found")
    end

    def render_record_invalid(error)
      render_error(:unprocessable_entity, "validation_failed", "The submitted data is invalid", error.record.errors.to_hash)
    end

    def render_bad_request(error)
      render_error(:bad_request, "bad_request", error.message)
    end

    def render_daily_limit
      render_error(:too_many_requests, "submission_limit_reached", "Daily contribution limit reached")
    end

    def render_forbidden(error)
      render_error(:forbidden, "forbidden", error.message.presence || "This action is not allowed")
    end
end
