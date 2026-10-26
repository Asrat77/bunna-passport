import type { StampLevel } from "@/design/seal/levels";
import { phCoffeeBean } from "./icons";
import { Icon } from "./Icon";

/**
 * A café's logo in lists (docs/DESIGN.md §2.2.1): a bean in a ring that
 * carries your standing there. Bronze rings in mocha, higher levels in
 * silver, and a dashed ring until you've been.
 */
export function StampRing({ level, size = 48 }: { level: StampLevel | null; size?: number }) {
  const tone = level === null ? "empty" : level === "bronze" ? "bronze" : "silver";
  return (
    <span className={`stamp-ring stamp-ring--${tone}`} style={{ width: size, height: size }} aria-hidden="true">
      <Icon path={phCoffeeBean} size={Math.round(size * 0.42)} />
    </span>
  );
}
