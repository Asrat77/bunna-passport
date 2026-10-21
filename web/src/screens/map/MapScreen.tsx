import { lazy, Suspense } from "react";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { BackControl } from "@/telegram/buttons";
import { Headline } from "@/ui/Headline";

// MapLibre is most of the bundle, so the list ships first and the map only
// loads behind the Map tile.
const ShopMap = lazy(() => import("./ShopMap"));

/** Where the self-hosted Addis style lives (PMTiles on R2, per the exploration). */
const STYLE_URL: string | undefined = import.meta.env.VITE_MAP_STYLE_URL;

export function MapScreen() {
  const { t } = useI18n();
  const { back } = useNavigation();
  return (
    <main className="screen map-screen">
      <BackControl onBack={back} label={t("common.back")} />
      <Headline first={t("explore.titleNext")} second={t("explore.titleNextB")} size={30} />
      {STYLE_URL ? (
        <Suspense fallback={<div className="skeleton map-screen__map" aria-label={t("map.loading")} />}>
          <ShopMap styleUrl={STYLE_URL} />
        </Suspense>
      ) : (
        <p className="notice">{t("map.unavailable")}</p>
      )}
    </main>
  );
}
