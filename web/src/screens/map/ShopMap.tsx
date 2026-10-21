import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { useEffect, useRef, useState } from "react";
import { useCatalog } from "@/data/queries";
import { useStampsByShop } from "@/data/stamps";
import { useI18n } from "@/i18n/context";
import { useLocation } from "@/location/LocationProvider";
import { useNavigation } from "@/nav/Navigation";

const ADDIS: [number, number] = [38.7578, 9.0301];
let protocolAdded = false;

/**
 * The shop map: self-hosted Addis tiles through the pmtiles:// protocol, a
 * pin per café (filled once stamped, dashed until then) and your position.
 */
export default function ShopMap({ styleUrl }: { styleUrl: string }) {
  const { t } = useI18n();
  const { push } = useNavigation();
  const catalog = useCatalog();
  const stamps = useStampsByShop();
  const { fix } = useLocation();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    if (!protocolAdded) {
      maplibregl.addProtocol("pmtiles", new Protocol().tile);
      protocolAdded = true;
    }
    try {
      map.current = new maplibregl.Map({
        container: container.current,
        style: styleUrl,
        center: ADDIS,
        zoom: 13,
        attributionControl: { compact: true },
      });
      map.current.on("error", () => setFailed(true));
    } catch {
      setFailed(true);
    }
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [styleUrl]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const markers = (catalog.data ?? []).map((shop) => {
      const element = document.createElement("button");
      element.type = "button";
      element.className = stamps.has(shop.id) ? "map-pin map-pin--stamped" : "map-pin";
      element.setAttribute("aria-label", shop.name);
      element.addEventListener("click", () => push({ name: "shop", id: shop.id }));
      return new maplibregl.Marker({ element }).setLngLat([shop.longitude, shop.latitude]).addTo(instance);
    });
    let you: maplibregl.Marker | null = null;
    if (fix) {
      const element = document.createElement("span");
      element.className = "map-you";
      element.setAttribute("aria-label", t("map.you"));
      you = new maplibregl.Marker({ element }).setLngLat([fix.longitude, fix.latitude]).addTo(instance);
      instance.jumpTo({ center: [fix.longitude, fix.latitude], zoom: 15 });
    }
    return () => {
      markers.forEach((marker) => marker.remove());
      you?.remove();
    };
  }, [catalog.data, stamps, fix, push, t]);

  if (failed) return <p className="notice">{t("map.unavailable")}</p>;
  return <div ref={container} className="map-screen__map" />;
}
