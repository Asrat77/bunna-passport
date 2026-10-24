/**
 * One-colour utility glyphs (DESIGN.md §2.4) from ui/glyphs.ts, one path each in
 * the @mdi/js format. Illustrated icons for 24 px and up are Print.
 */
export function Icon({ path, size = 22, label }: { path: string; size?: number; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ display: "block", flexShrink: 0 }}
    >
      <path d={path} />
    </svg>
  );
}
