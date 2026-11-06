Fonts for the server-rendered share cards (`ShareCard`, `InviteCard`), from the
Fontsource packages the Mini App already uses (`web/package.json`): Geist,
Geist Mono, Noto Sans Ethiopic and Noto Serif Ethiopic. All are under the SIL
Open Font License 1.1. The Docker image installs them for fontconfig, which is
how librsvg finds them.

They are plain TrueType (`.ttf`), unpacked from Fontsource's `.woff` files with
fontTools. Keep them that way: the Pango and HarfBuzz in the production image
(Debian bookworm) can't shape WOFF, so Amharic drew as empty boxes there even
though it rendered fine on newer systems. `test/models/share_card/fonts_test.rb`
checks this.
