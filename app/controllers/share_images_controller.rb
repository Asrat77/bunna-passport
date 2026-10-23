# Serves a stored share card by its token. Telegram's servers fetch these
# without signing in. Cached for a day: a new ShareCard::VERSION re-renders
# under the same token, so caches catch up by the next day.
class ShareImagesController < ActionController::API
  def show
    image = ShareImage.find_by!(token: params[:token])

    response.headers["X-Robots-Tag"] = "noindex"
    expires_in 1.day, public: true
    send_data image.png.download, type: "image/png", disposition: "inline", filename: image.png.filename.to_s
  rescue ActiveRecord::RecordNotFound
    head :not_found
  end
end
