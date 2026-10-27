import * as maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { FeatureCollection } from "geojson";
import type { Candidate } from "@/data/checkin";
import { useStampsByShop } from "@/data/stamps";
import { useI18n } from "@/i18n/context";
import type { Fix } from "@/location/locate";
import { addPinImages, pinColours, prepareMapLibre, RANGE, rangeBounds, rangeFeatures, showRange } from "@/screens/map/layers";
import { PIN_OPEN, PIN_STAMPED } from "@/screens/map/pins";

const CANDIDATES = "candidates";

type Props = {
  fix: Fix;
  candidates: Candidate[];
  selectedId: number | null;
  styleUrl: string;
  description: string;
  onFail: () => void;
};

/**
 * The check-in radar on the real map: the streets round you, the 250 m
 * check-in range, you, and each candidate café as the map's cup pin. Cafés out
 * of range sit faded; the chosen one is larger and always named. It holds
 * still (no panning) so it reads as a picture of where you are, and refits to
 * the circle whenever your position moves.
 */
export default function CheckInMap({ fix, candidates, selectedId, styleUrl, description, onFail }: Props) {
  const { t, language } = useI18n();
  const stamps = useStampsByShop();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const appliedStyle = useRef(styleUrl);
  const range = useRef(rangeFeatures(fix));
  const cafes = useRef<FeatureCollection>({ type: "FeatureCollection", features: [] });
  const rangeLabel = useRef(t("map.range"));
  const fail = useRef(onFail);
  rangeLabel.current = t("map.range");
  fail.current = onFail;

  useEffect(() => {
    if (!container.current) return;
    prepareMapLibre();
    try {
      map.current = new maplibregl.Map({
        container: container.current,
        style: appliedStyle.current,
        bounds: rangeBounds(fix),
        fitBoundsOptions: { padding: 20 },
        interactive: false,
        attributionControl: { compact: true },
      });
      const instance = map.current;
      instance.on("error", (event) => {
        if (!("sourceId" in event) && !("tile" in event)) fail.current();
      });
      instance.on("style.load", () => {
        const colours = pinColours();
        addPinImages(instance, colours);
        showRange(instance, range.current, rangeLabel.current);
        showCandidates(instance, cafes.current, colours);
      });
    } catch {
      fail.current();
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
    const instance = map.current;
    if (!instance) return;
    range.current = rangeFeatures(fix);
    instance.getSource<maplibregl.GeoJSONSource>(RANGE)?.setData(range.current);
    instance.fitBounds(rangeBounds(fix), { padding: 20, duration: 400 });
    const element = document.createElement("span");
    element.className = "map-you";
    element.setAttribute("aria-label", t("map.you"));
    const you = new maplibregl.Marker({ element }).setLngLat([fix.longitude, fix.latitude]).addTo(instance);
    return () => {
      you.remove();
    };
  }, [fix, t]);

  useEffect(() => {
    cafes.current = {
      type: "FeatureCollection",
      features: candidates.map(({ shop, inRange }) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [shop.longitude, shop.latitude] },
        properties: {
          name: language === "am" && shop.name_am ? shop.name_am : shop.name,
          stamped: stamps.has(shop.id),
          inRange,
          selected: shop.id === selectedId,
        },
      })),
    };
    map.current?.getSource<maplibregl.GeoJSONSource>(CANDIDATES)?.setData(cafes.current);
  }, [candidates, selectedId, stamps, language]);

  return <div ref={container} className="radar__map" role="img" aria-label={description} />;
}

function showCandidates(instance: maplibregl.Map, data: FeatureCollection, colours: ReturnType<typeof pinColours>) {
  instance.addSource(CANDIDATES, { type: "geojson", data });
  instance.addLayer({
    id: CANDIDATES,
    type: "symbol",
    source: CANDIDATES,
    layout: {
      "icon-image": ["case", ["get", "stamped"], PIN_STAMPED, PIN_OPEN],
      "icon-size": ["case", ["get", "selected"], 1.15, 0.9],
      "icon-allow-overlap": true,
      "symbol-sort-key": ["case", ["get", "selected"], 0, ["get", "inRange"], 1, 2],
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Medium"],
      "text-size": ["case", ["get", "selected"], 12, 11],
      "text-anchor": "top",
      "text-offset": [0, 1.1],
      "text-max-width": 9,
      "text-optional": true,
    },
    paint: {
      "icon-opacity": ["case", ["get", "inRange"], 1, 0.45],
      "text-color": colours.ink,
      "text-opacity": ["case", ["get", "inRange"], 1, 0.55],
      "text-halo-color": colours.surface,
      "text-halo-width": 1.5,
    },
  });
}
