import { openLink, popup } from "@telegram-apps/sdk-react";
export function mapsUrl(shop) {
    return `https://www.openstreetmap.org/?mlat=${shop.latitude}&mlon=${shop.longitude}#map=18/${shop.latitude}/${shop.longitude}`;
}
/** Opens a shop's location outside the Mini App. */
export function openInMaps(shop) {
    const url = mapsUrl(shop);
    const [opened] = openLink.ifAvailable(url);
    if (!opened)
        window.open(url, "_blank", "noopener");
}
/** The row's ⋮ menu: a native popup in Telegram, straight to maps elsewhere. */
export async function shopMenu(shop, labels) {
    if (!popup.show.isAvailable()) {
        openInMaps(shop);
        return;
    }
    const choice = await popup.show({
        title: labels.title,
        message: shop.landmark,
        buttons: [
            { id: "maps", type: "default", text: labels.openMaps },
            { id: "cancel", type: "cancel" },
        ],
    });
    if (choice === "maps")
        openInMaps(shop);
}
