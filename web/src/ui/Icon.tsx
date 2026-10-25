/**
 * Phosphor icons (DESIGN.md §2.4), drawn from the paths in ./icons so only the
 * icons used end up in the bundle.
 */
export function Icon({ path, size = 22, label }: { path: string; size?: number; label?: string }) {
  return (
    <svg
      viewBox="0 0 256 256"
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
