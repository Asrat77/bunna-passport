/**
 * Bunna print icons (DESIGN.md §2.4): illustrated, multi-colour SVGs for 24 px
 * and up. "sketch" is the pencil alone, for an inactive tab, an empty cup or a
 * tile not picked; "print" is the full colour. Each file comes in graphite
 * pencil and in cream pencil for Dark Roast; both are rendered and the theme
 * shows one, so the swap follows [data-theme] without a re-render.
 */
const files = import.meta.glob<string>("./prints/*.svg", { eager: true, query: "?url", import: "default" });

export type PrintName = "explore" | "passport" | "stats" | "check-in" | "near-me" | "map" | "jebena" | "not-yet" | "cup" | "check-ceremony";

type Props = {
  name: PrintName;
  size: number;
  state?: "print" | "sketch";
  /** The large print, with grain and confetti, for 64 px and up. */
  large?: boolean;
  /** Swaps the pencil for a coloured ground: the Check in pill is clay in light and amber in dark. */
  inverse?: boolean;
  label?: string;
};

function url(file: string) {
  const found = files[`./prints/${file}`];
  if (!found) throw new Error(`Missing print ${file}`);
  return found;
}

export function Print({ name, size, state = "print", large = false, inverse = false, label }: Props) {
  const stem = large ? `bp-${name}` : `bp-${name}${state === "sketch" ? "-sketch" : ""}-sm`;
  const graphite = url(`${stem}.svg`);
  const cream = url(`${stem}-dark.svg`);
  const [light, dark] = inverse ? [cream, graphite] : [graphite, cream];

  return (
    <span
      className="print"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ width: size, height: size }}
    >
      <img className="print__light" src={light} alt="" width={size} height={size} draggable={false} />
      <img className="print__dark" src={dark} alt="" width={size} height={size} draggable={false} />
    </span>
  );
}
