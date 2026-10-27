import * as maplibregl from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";
import type { OpaqueId, Shop } from "@/api/types";
import { useCatalog } from "@/data/queries";
import { useStampsByShop } from "@/data/stamps";
import { useI18n } from "@/i18n/context";
import { distanceMeters } from "@/lib/distance";
import { useLocation } from "@/location/LocationProvider";
import { useNavigation } from "@/nav/Navigation";
import { Icon } from "@/ui/Icon";
import { phCrosshair } from "@/ui/icons";
import { CafeCard } from "./CafeCard";
import { addPinImages, LOCATE_ZOOM, pinColours, pixelRatio, prepareMapLibre, RANGE, rangeFeatures, showRange } from "./layers";
import { CLUSTER_PREFIX, drawCluster, PIN_OPEN, PIN_STAMPED } from "./pins";

const ADDIS: [number, number] = [38.7578, 9.0301];
const CAFES = "cafes";
const CLUSTERS = "cafe-clusters";
const PINS = "cafe-pins";
const SELECTED = "cafe-selected";
/** Roughly the card's height: a pin lower than this would sit under it. */
const CARD_CLEARANCE = 250;
const NOTHING = -1;

/**
 * The shop map: self-hosted Addis tiles through the pmtiles:// protocol, the
 * cafés and your position. Zoomed out, nearby cafés gather into a pill that
 * says how many ("☕ 24"); zoomed in, each is a small Mocha cup disc, ticked
 * once you've been, with its name. Cafés are
 * map layers rather than DOM markers, so a thousand of them stay smooth and
 * MapLibre drops the names that would collide. Round you sits the check-in
 * range, the circle a café has to be inside for its stamp to count, and the
 * locate button brings you back to it. Tapping a café opens its card over the
 * map's foot, with a ring round its pin; tapping the map away closes it. A new style URL (the phone
 * switching light or dark) restyles the same map, so the view stays put.
 */
export default function ShopMap({ styleUrl }: { styleUrl: string }) {
  const { t, language } = useI18n();
  const { push } = useNavigation();
  const catalog = useCatalog();
  const stamps = useStampsByShop();
  const { fix, status, refresh } = useLocation();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const appliedStyle = useRef(styleUrl);
  const cafes = useRef<FeatureCollection>({ type: "FeatureCollection", features: [] });
  const range = useRef<FeatureCollection>({ type: "FeatureCollection", features: [] });
  const rangeLabel = useRef(t("map.range"));
  const selectedRef = useRef<number | null>(null);
  const centred = useRef(false);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  selectedRef.current = selected;
  rangeLabel.current = t("map.range");

  useEffect(() => {
    if (!container.current) return;
    prepareMapLibre();
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
      instance.on("style.load", () => {
        showRange(instance, range.current, rangeLabel.current);
        showCafes(instance, cafes.current, selectedRef.current);
      });
      // Cluster pills are drawn per count the first time a count shows up.
      instance.on("styleimagemissing", ({ id }) => {
        if (!id.startsWith(CLUSTER_PREFIX) || instance.hasImage(id)) return;
        const ratio = pixelRatio();
        instance.addImage(id, drawCluster(pinColours(), id.slice(CLUSTER_PREFIX.length), ratio), { pixelRatio: ratio });
      });
      instance.on("click", PINS, (event) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;
        setSelected(Number(feature.properties.id));
        // Bring the pin up if the card would cover it.
        const coordinates = feature.geometry.coordinates as [number, number];
        if (instance.project(coordinates).y > instance.getContainer().clientHeight - CARD_CLEARANCE) {
          instance.easeTo({ center: coordinates, offset: [0, -CARD_CLEARANCE / 2] });
        }
      });
      // A tap on the map itself, not a café, puts the card away.
      instance.on("click", (event) => {
        if (instance.queryRenderedFeatures(event.point, { layers: [PINS, CLUSTERS] }).length === 0) setSelected(null);
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
    map.current?.getLayer(SELECTED) && map.current.setFilter(SELECTED, selectedFilter(selected));
  }, [selected]);

  const selectedShop = useMemo(
    () => (selected === null ? undefined : catalog.data?.find((shop) => shop.id === selected)),
    [catalog.data, selected],
  );

  useEffect(() => {
    const instance = map.current;
    if (!instance || !fix) return;
    const element = document.createElement("span");
    element.className = "map-you";
    element.setAttribute("aria-label", t("map.you"));
    const you = new maplibregl.Marker({ element }).setLngLat([fix.longitude, fix.latitude]).addTo(instance);
    range.current = rangeFeatures(fix);
    instance.getSource<maplibregl.GeoJSONSource>(RANGE)?.setData(range.current);
    if (!centred.current) {
      centred.current = true;
      instance.flyTo({ center: [fix.longitude, fix.latitude], zoom: LOCATE_ZOOM, speed: 0.8 });
    }
    return () => {
      you.remove();
    };
  }, [fix, t]);

  // Fly to the last fix straight away, then again if a fresh one has moved.
  async function locateMe() {
    const instance = map.current;
    if (!instance) return;
    if (fix) instance.flyTo({ center: [fix.longitude, fix.latitude], zoom: Math.max(instance.getZoom(), LOCATE_ZOOM) });
    centred.current = true;
    const next = await refresh();
    if (next) instance.flyTo({ center: [next.longitude, next.latitude], zoom: Math.max(instance.getZoom(), LOCATE_ZOOM) });
  }

  if (failed) return <p className="notice">{t("map.unavailable")}</p>;
  return (
    <div className="map-screen__frame">
      <div ref={container} className="map-screen__map" />
      {selectedShop ? (
        <CafeCard
          key={selectedShop.id}
          shop={selectedShop}
          stamp={stamps.get(selectedShop.id)}
          distance={fix ? distanceMeters(fix, selectedShop) : null}
          onOpen={() => push({ name: "shop", id: selectedShop.id })}
          onClose={() => setSelected(null)}
        />
      ) : (
        <button
        type="button"
        className="map-locate"
        aria-label={t("map.locate")}
        aria-busy={status === "locating" || undefined}
        onClick={() => void locateMe()}
      >
        <Icon path={phCrosshair} size={22} />
      </button>
      )}
    </div>
  );
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

/** Only the chosen café's pin, or none. */
function selectedFilter(id: number | null): maplibregl.FilterSpecification {
  return ["all", ["!", ["has", "point_count"]], ["==", ["get", "id"], id ?? NOTHING]];
}

/** The café source, its pin images, the chosen café's ring and the two layers that draw them. */
function showCafes(instance: maplibregl.Map, data: FeatureCollection, selected: number | null) {
  const colours = pinColours();
  addPinImages(instance, colours);

  instance.addSource(CAFES, {
    type: "geojson",
    data,
    cluster: true,
    clusterRadius: 48,
    clusterMaxZoom: 15,
  });

  // A soft Mocha halo under the pin whose card is open.
  instance.addLayer({
    id: SELECTED,
    type: "circle",
    source: CAFES,
    filter: selectedFilter(selected),
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 15, 17, 19],
      "circle-color": colours.mocha,
      "circle-opacity": 0.22,
      "circle-stroke-color": colours.mocha,
      "circle-stroke-width": 2,
    },
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
