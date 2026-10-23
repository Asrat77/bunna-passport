/**
 * The Amharic-labelled twin script/publish_addis_map writes beside each style:
 * style-light.json has style-light-am.json next to it.
 */
export function amharicStyle(url: string): string {
  return url.replace(/\.json(?=$|\?)/, "-am.json");
}
