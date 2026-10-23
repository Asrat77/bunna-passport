# The Mini App may be served from a different origin than the API, such as
# Appwrite Sites. The API authenticates with bearer tokens, never cookies, so
# no credentials are allowed across origins.
#
# CORS_ORIGINS is a comma-separated list of exact origins. It defaults to the
# Appwrite site; set it to an empty string to turn cross-origin access off.
origins = ENV.fetch("CORS_ORIGINS", "https://bunna-passport.appwrite.network")
  .split(",").map(&:strip).reject(&:empty?)

if origins.any?
  Rails.application.config.middleware.insert_before 0, Rack::Cors do
    allow do
      origins(*origins)
      resource "/api/*",
        headers: :any,
        methods: %i[ get post patch delete options head ],
        max_age: 600
    end
  end
end
