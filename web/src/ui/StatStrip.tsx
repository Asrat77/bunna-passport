import type { ReactNode } from "react";

/** Three cells in one raised card, a mono value over a small label. */
export function StatStrip({ stats }: { stats: { value: ReactNode; label: string }[] }) {
  return (
    <dl className="stat-strip">
      {stats.map((stat) => (
        <div key={stat.label} className="stat-strip__cell">
          <dd className="stat-strip__value mono">{stat.value}</dd>
          <dt className="stat-strip__label">{stat.label}</dt>
        </div>
      ))}
    </dl>
  );
}
