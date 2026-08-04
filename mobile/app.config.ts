import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Keeps Mapbox's secret native-SDK download token out of source control.
 * EAS should provide RNMAPBOX_MAPS_DOWNLOAD_TOKEN as a secret environment
 * variable; the public runtime token is EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const downloadToken = process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN;
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
      downloadToken
        ? ["@rnmapbox/maps", { RNMapboxMapsDownloadToken: downloadToken }]
        : "@rnmapbox/maps",
    ],
  };
};
