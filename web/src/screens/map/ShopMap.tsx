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
import { CLUSTER_PREFIX, drawCluster, drawPin, PIN_OPEN, PIN_STAMPED, type PinColours } from "./pins";

const ADDIS: [number, number] = [38.7578, 9.0301];
const CAFES = "cafes";
const CLUSTERS = "cafe-clusters";
const PINS = "cafe-pins";
let protocolAdded = false;

// MapLibre finds its worker next to its own module, which Vite moves when it
// bundles it (and pre-bundles it in dev), so point it at the emitted copy.
// Without a worker no tile is ever parsed and only the background shows.
maplibregl.setWorkerUrl(workerUrl);

/**
 * The shop map: self-hosted Addis tiles through the pmtiles:// protocol, the
 * cafés and your position. Zoomed out, nearby cafés gather into a pill that
 * says how many ("☕ 24"); zoomed in, each is a small Mocha cup disc, ticked
 * once you've been, with its name. Cafés are
 * map layers rather than DOM markers, so a thousand of them stay smooth and
 * MapLibre drops the names that would collide. A new style URL (the phone
 * switching light or dark) restyles the same map, so the view stays put.
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
  const cafes = useRef<FeatureCollection>({ type: "FeatureCollection", features: [] });
  const openShop = useRef(push);
  const centred = useRef(false);
  const [failed, setFailed] = useState(false);
  openShop.current = push;

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
      // setStyle drops our layers and images with the old style, so add them each time.
      instance.on("style.load", () => showCafes(instance, cafes.current));
      // Cluster pills are drawn per count the first time a count shows up.
      instance.on("styleimagemissing", ({ id }) => {
        if (!id.startsWith(CLUSTER_PREFIX) || instance.hasImage(id)) return;
        const ratio = pixelRatio();
        instance.addImage(id, drawCluster(pinColours(), id.slice(CLUSTER_PREFIX.length), ratio), { pixelRatio: ratio });
      });
      instance.on("click", PINS, (event) => {
        const id = event.features?.[0]?.properties?.id;
        if (id != null) openShop.current({ name: "shop", id: Number(id) });
      });
      instance.on("click", CLUSTERS, async (event) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;
        const source = instance.getSource<maplibregl.GeoJSONSource>(CAFES);
        const zoom = await source?.getClusterExpansionZoom(feature.properties.cluster_id);
        if (zoom != null) instance.easeTo({ center: feature.geometry.coordinates as [number, number], zoom: zoom + 0.5 });
      });
      for (const layer of [PINS, CLUSTERS]) {
        instance.on("mouseenter", layer, () => (instance.getCanvas().style.cursor = "pointer"));
        instance.on("mouseleave", layer, () => (instance.getCanvas().style.cursor = ""));
      }
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
    cafes.current = cafeFeatures(catalog.data ?? [], stamps, language);
    map.current?.getSource<maplibregl.GeoJSONSource>(CAFES)?.setData(cafes.current);
  }, [catalog.data, stamps, language]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !fix) return;
    const element = document.createElement("span");
    element.className = "map-you";
    element.setAttribute("aria-label", t("map.you"));
    const you = new maplibregl.Marker({ element }).setLngLat([fix.longitude, fix.latitude]).addTo(instance);
    if (!centred.current) {
      centred.current = true;
      instance.flyTo({ center: [fix.longitude, fix.latitude], zoom: 15.5, speed: 0.8 });
    }
    return () => {
      you.remove();
    };
  }, [fix, t]);

  if (failed) return <p className="notice">{t("map.unavailable")}</p>;
  return <div ref={container} className="map-screen__map" />;
}

function cafeFeatures(shops: Shop[], stamps: ReadonlyMap<OpaqueId, unknown>, language: string): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: shops.map((shop) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [shop.longitude, shop.latitude] },
      properties: {
        id: shop.id,
        name: language === "am" && shop.name_am ? shop.name_am : shop.name,
        stamped: stamps.has(shop.id),
      },
    })),
  };
}

/** The map's colours for this theme, read from the CSS tokens. */
function pinColours(): PinColours {
  const tokens = getComputedStyle(document.documentElement);
  const token = (name: string) => tokens.getPropertyValue(name).trim();
  return {
    mocha: token("--mocha"),
    onMocha: token("--mocha-text"),
    raised: token("--raised"),
    ink: token("--ink"),
    border: token("--border-strong"),
    badge: token("--ink"),
    surface: token("--surface"),
    shadow: token("--shadow"),
  };
}

function pixelRatio() {
  return Math.max(2, Math.ceil(window.devicePixelRatio || 1));
}

/** The café source, its pin images and the two layers that draw it. */
function showCafes(instance: maplibregl.Map, data: FeatureCollection) {
  const colours = pinColours();
  const ratio = pixelRatio();
  for (const [id, stamped] of [[PIN_STAMPED, true], [PIN_OPEN, false]] as const) {
    if (instance.hasImage(id)) instance.removeImage(id);
    instance.addImage(id, drawPin(colours, stamped, ratio), { pixelRatio: ratio });
  }

  instance.addSource(CAFES, {
    type: "geojson",
    data,
    cluster: true,
    clusterRadius: 48,
    clusterMaxZoom: 15,
  });

  instance.addLayer({
    id: CLUSTERS,
    type: "symbol",
    source: CAFES,
    filter: ["has", "point_count"],
    layout: {
      "icon-image": ["concat", CLUSTER_PREFIX, ["get", "point_count_abbreviated"]],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  });
  instance.addLayer({
    id: PINS,
    type: "symbol",
    source: CAFES,
    filter: ["!", ["has", "point_count"]],
    layout: {
      "icon-image": ["case", ["get", "stamped"], PIN_STAMPED, PIN_OPEN],
      "icon-size": ["interpolate", ["linear"], ["zoom"], 13, 0.8, 17, 1],
      "icon-allow-overlap": true,
      "symbol-sort-key": ["case", ["get", "stamped"], 1, 0],
      "text-field": ["step", ["zoom"], "", 15, ["get", "name"]],
      "text-font": ["Noto Sans Medium"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 15, 11, 18, 13],
      "text-anchor": "top",
      "text-offset": [0, 1.1],
      "text-max-width": 9,
      "text-optional": true,
    },
    paint: {
      "text-color": colours.ink,
      "text-halo-color": colours.surface,
      "text-halo-width": 1.5,
    },
  });
}
