# Serves the Telegram Mini App's page. Its scripts and styles are fingerprinted
# under public/app/assets and cached for a year, but the page itself must be
# fetched fresh, or Telegram keeps opening the previous release. That is why it
# lives outside public/, where it would get the same year-long cache header.
class MiniAppsController < ActionController::API
  class_attribute :page, default: Rails.root.join("mini_app", "index.html")

  def show
    return head :not_found unless page.exist?

    response.headers["Cache-Control"] = "no-cache"
    # Telegram Desktop and Telegram Web show Mini Apps in an iframe.
    response.headers.delete("X-Frame-Options")
    send_file page, type: "text/html", disposition: "inline"
  end
end
