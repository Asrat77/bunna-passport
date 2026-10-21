import type { ReactNode } from "react";

/** A filter or segment chip; selected is ink on surface. */
export function FilterChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className="chip chip--filter" aria-pressed={selected} onClick={onClick}>
      {children}
    </button>
  );
}

export function TagChip({ children }: { children: ReactNode }) {
  return <span className="chip chip--tag">{children}</span>;
}

/** The dashed "add something" chip: Suggest edit, Note. */
export function AddChip({ onClick, icon, children, pressed }: { onClick: () => void; icon?: ReactNode; children: ReactNode; pressed?: boolean }) {
  return (
    <button type="button" className="chip chip--add" onClick={onClick} aria-pressed={pressed}>
      {icon}
      {children}
    </button>
  );
}
