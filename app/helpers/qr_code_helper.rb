require "rqrcode"

module QrCodeHelper
  # An inline SVG QR code that prints sharp at any size. Medium error
  # correction survives a scuffed or slightly curled counter sticker.
  def qr_code_svg(text, label:)
    svg = RQRCode::QRCode.new(text, level: :m).as_svg(
      use_path: true, viewbox: true, svg_attributes: { class: "qr", role: "img", "aria-label": label }
    )
    svg.html_safe # rubocop:disable Rails/OutputSafety -- built by rqrcode from our own URL, no user markup
  end
end
