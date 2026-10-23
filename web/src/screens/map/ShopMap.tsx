import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { Protocol } from "pmtiles";
import { useEffect, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";
import type { OpaqueId, Shop } from "@/api/types";
import { useCatalog } from "@/data/queries";
import { useStampsByShop } from "@/data/stamps";
import { useI18n } from "@/i18n/context";
import { useLocation } from "@/location/LocationProvider";
import { useNavigation } from "@/nav/Navigation";

const ADDIS: [number, number] = [38.7578, 9.0301];
const NAMES = "cafe-names";
let protocolAdded = false;

// MapLibre finds its worker next to its own module, which Vite moves when it
// bundles it (and pre-bundles it in dev), so point it at the emitted copy.
// Without a worker no tile is ever parsed and only the background shows.
maplibregl.setWorkerUrl(workerUrl);

/**
 * The shop map: self-hosted Addis tiles through the pmtiles:// protocol, a
 * pin per café (filled once stamped, dashed until then) and your position.
 * A new style URL (the phone switching light or dark) restyles the same map,
 * so the pins and the view stay put. Café names are a map layer rather than
 * part of the pins, so MapLibre hides the ones that would collide.
 */
export default function ShopMap({ styleUrl }: { styleUrl: string }) {
  const { t, language } = useI18n();
  const { push } = useNavigation();
  const catalog = useCatalog();
  const stamps = useStampsByShop();
  const { fix } = useLocation();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const appliedStyle = useRef(styleUrl);
  const names = useRef<FeatureCollection>({ type: "FeatureCollection", features: [] });
  const centred = useRef(false);
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
        style: appliedStyle.current,
        center: ADDIS,
        zoom: 13,
        attributionControl: { compact: true },
      });
      const instance = map.current;
      // A single tile that fails (a slow network, r2.dev throttling) shouldn't
      // take the whole map away; a style or worker that fails should.
      instance.on("error", (event) => {
        if (!("sourceId" in event) && !("tile" in event)) setFailed(true);
      });
      // setStyle drops our layer along with the old style, so add it each time.
      instance.on("style.load", () => showNames(instance, names.current));
    } catch {
      setFailed(true);
    }
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || styleUrl === appliedStyle.current) return;
    appliedStyle.current = styleUrl;
    map.current.setStyle(styleUrl);
  }, [styleUrl]);

  useEffect(() => {
    names.current = nameFeatures(catalog.data ?? [], stamps, language);
    const source = map.current?.getSource<maplibregl.GeoJSONSource>(NAMES);
    source?.setData(names.current);
  }, [catalog.data, stamps, language]);

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
      if (!centred.current) {
        centred.current = true;
        instance.flyTo({ center: [fix.longitude, fix.latitude], zoom: 15.5, speed: 0.8 });
      }
    }
    return () => {
      markers.forEach((marker) => marker.remove());
      you?.remove();
    };
  }, [catalog.data, stamps, fix, push, t]);

  if (failed) return <p className="notice">{t("map.unavailable")}</p>;
  return <div ref={container} className="map-screen__map" />;
}

function nameFeatures(shops: Shop[], stamps: ReadonlyMap<OpaqueId, unknown>, language: string): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: shops.map((shop) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [shop.longitude, shop.latitude] },
      properties: {
        name: language === "am" && shop.name_am ? shop.name_am : shop.name,
        stamped: stamps.has(shop.id),
      },
    })),
  };
}

/** Café names under the pins, in the app's own ink, from street level in. */
function showNames(instance: maplibregl.Map, data: FeatureCollection) {
  const tokens = getComputedStyle(document.documentElement);
  const token = (name: string) => tokens.getPropertyValue(name).trim();
  instance.addSource(NAMES, { type: "geojson", data });
  instance.addLayer({
    id: NAMES,
    type: "symbol",
    source: NAMES,
    minzoom: 14,
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Medium"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 14, 11, 17, 13],
      "text-anchor": "top",
      "text-offset": [0, 1.1],
      "text-max-width": 9,
      "text-padding": 4,
      "symbol-sort-key": ["case", ["get", "stamped"], 0, 1],
    },
    paint: {
      "text-color": ["case", ["get", "stamped"], token("--primary"), token("--ink")],
      "text-halo-color": token("--surface"),
      "text-halo-width": 1.5,
    },
  });
}
