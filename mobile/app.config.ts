import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Keeps Mapbox's secret native-SDK download token out of source control.
 * The Mapbox config plugin reads RNMAPBOX_MAPS_DOWNLOAD_TOKEN directly from
 * the native build environment; passing it as a config option would copy it
 * into gradle.properties. The public runtime token is
 * EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins = (config.plugins ?? []).filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return name !== "@rnmapbox/maps";
  });

  return {
    ...config,
    name: config.name ?? "Bunna Passport",
    slug: config.slug ?? "bunna-passport",
    plugins: [
      ...plugins,
      "@rnmapbox/maps",
    ],
  };
};
