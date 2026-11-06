import { lazy, Suspense } from "react";
import { filterOptions, findShops } from "@/data/nearby";
import { useCatalog } from "@/data/queries";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { BackControl } from "@/telegram/buttons";
import { CafeFilterChips } from "@/ui/CafeFilters";
import { Headline } from "@/ui/Headline";
import { useMapStyle } from "./useMapStyle";

// MapLibre is most of the bundle, so the list ships first and the map only
// loads behind the Map tile.
const ShopMap = lazy(() => import("./ShopMap"));

export function MapScreen() {
  const { t } = useI18n();
  const { back } = useNavigation();
  const styleUrl = useMapStyle();
  const catalog = useCatalog();
  return (
    <main className="screen map-screen">
      <BackControl onBack={back} label={t("common.back")} />
      <Headline first={t("explore.titleNext")} second={t("explore.titleNextB")} size={30} />
      <CafeFilterChips
        count={(filters) =>
          findShops(catalog.data ?? [], { origin: null, query: "", stamped: new Set(), ...filterOptions(filters) }).length
        }
      />
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
