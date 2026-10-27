import { useI18n } from "@/i18n/context";
import { useScheme } from "@/telegram/theme";
import { amharicStyle } from "./styleUrl";

/**
 * Where the self-hosted Addis styles live (PMTiles on R2, published by
 * script/publish_addis_map). Dark falls back to light when it isn't set.
 */
const STYLE_URL: string | undefined = import.meta.env.VITE_MAP_STYLE_URL;
const DARK_STYLE_URL: string | undefined = import.meta.env.VITE_MAP_STYLE_DARK_URL ?? STYLE_URL;

/** The basemap for the phone's theme and the app's language, or undefined when none is configured. */
export function useMapStyle(): string | undefined {
  const { language } = useI18n();
  const schemeUrl = useScheme() === "dark" ? DARK_STYLE_URL : STYLE_URL;
  return schemeUrl && language === "am" ? amharicStyle(schemeUrl) : schemeUrl;
}
