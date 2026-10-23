import { lazy, Suspense } from "react";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { BackControl } from "@/telegram/buttons";
import { useScheme } from "@/telegram/theme";
import { Headline } from "@/ui/Headline";
import { amharicStyle } from "./styleUrl";

// MapLibre is most of the bundle, so the list ships first and the map only
// loads behind the Map tile.
const ShopMap = lazy(() => import("./ShopMap"));

/**
 * Where the self-hosted Addis styles live (PMTiles on R2, published by
 * script/publish_addis_map). Dark falls back to light when it isn't set.
 */
const STYLE_URL: string | undefined = import.meta.env.VITE_MAP_STYLE_URL;
const DARK_STYLE_URL: string | undefined = import.meta.env.VITE_MAP_STYLE_DARK_URL ?? STYLE_URL;

export function MapScreen() {
  const { t, language } = useI18n();
  const { back } = useNavigation();
  const schemeUrl = useScheme() === "dark" ? DARK_STYLE_URL : STYLE_URL;
  const styleUrl = schemeUrl && language === "am" ? amharicStyle(schemeUrl) : schemeUrl;
  return (
    <main className="screen map-screen">
      <BackControl onBack={back} label={t("common.back")} />
      <Headline first={t("explore.titleNext")} second={t("explore.titleNextB")} size={30} />
      {styleUrl ? (
        <Suspense fallback={<div className="skeleton map-screen__map" aria-label={t("map.loading")} />}>
          <ShopMap styleUrl={styleUrl} />
        </Suspense>
      ) : (
        <p className="notice">{t("map.unavailable")}</p>
      )}
    </main>
  );
}
