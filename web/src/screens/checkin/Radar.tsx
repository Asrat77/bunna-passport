import { mdiAlertOutline, mdiCheck } from "@mdi/js";
import { ACCURACY_LIMIT_METERS, CHECK_IN_RANGE_METERS, bearing, type Candidate } from "@/data/checkin";
import { useI18n } from "@/i18n/context";
import { formatMeters, type Coordinate } from "@/lib/distance";
import type { Fix } from "@/location/locate";
import { Icon } from "@/ui/Icon";

const W = 358;
const H = 180;
const CX = 179;
const CY = 96;
const RANGE_R = 80;
const OUTSIDE_R = 86;

/**
 * The check-in radar (DESIGN.md §5.3): the 250 m range and its half as dashed
 * rings, a sweep, you in the middle with your accuracy as a halo, and a pin
 * per candidate placed by real bearing and distance. Shops out of range sit
 * greyed at the edge.
 */
export function Radar({ fix, candidates, selectedId }: { fix: Fix; candidates: Candidate[]; selectedId: number | null }) {
  const { t } = useI18n();
  const good = fix.accuracyMeters <= ACCURACY_LIMIT_METERS;
  const halo = Math.max(9, Math.min(RANGE_R, (fix.accuracyMeters / CHECK_IN_RANGE_METERS) * RANGE_R));
  const at: Coordinate = fix;

  const pins = candidates.map((candidate) => {
    const r = candidate.inRange ? (candidate.distance / CHECK_IN_RANGE_METERS) * RANGE_R : OUTSIDE_R;
    const angle = bearing(at, candidate.shop);
    return {
      candidate,
      x: Math.max(14, Math.min(W - 14, CX + Math.sin(angle) * r)),
      y: Math.max(14, Math.min(H - 22, CY - Math.cos(angle) * r)),
    };
  });

  const description = t("checkin.radar", {
    list: candidates
      .map((c) => t("checkin.radarEntry", { shop: c.shop.name, distance: formatMeters(c.distance) }))
      .join(", "),
  });

  return (
    <div className="radar card">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={description} className="radar__svg">
        <circle cx={CX} cy={CY} r={RANGE_R} fill="none" stroke="var(--border-strong)" strokeWidth={1.5} strokeDasharray="4 5" />
        <circle cx={CX} cy={CY} r={RANGE_R / 2} fill="none" stroke="var(--border)" strokeWidth={1.5} strokeDasharray="4 5" />
        <path className="radar__sweep" d={`M${CX} ${CY}L${CX} ${CY - RANGE_R}A${RANGE_R} ${RANGE_R} 0 0 1 ${CX + 69} ${CY - 40}Z`} fill="var(--primary)" opacity={0.16} />
        {pins.map(({ candidate, x, y }) =>
          candidate.inRange ? (
            <g key={candidate.shop.id}>
              <circle cx={x} cy={y} r={candidate.shop.id === selectedId ? 10 : 9} fill="var(--primary)" />
              {candidate.shop.id === selectedId ? <circle cx={x} cy={y} r={4} fill="var(--raised)" /> : null}
              <text
                x={x}
                y={y > CY ? y + 24 : y - 15}
                textAnchor="middle"
                fontSize={11.5}
                fontWeight={600}
                fill="var(--ink)"
              >
                {candidate.shop.name}
              </text>
            </g>
          ) : (
            <g key={candidate.shop.id}>
              <circle cx={x} cy={y} r={6} fill="var(--border-strong)" />
              <text x={x} y={y > CY ? y + 20 : y - 12} textAnchor="middle" fontSize={11} fill="var(--faint)">
                {candidate.shop.name} · {formatMeters(candidate.distance)}
              </text>
            </g>
          ),
        )}
        <circle cx={CX} cy={CY} r={halo} fill="var(--accent)" opacity={0.3} />
        <circle cx={CX} cy={CY} r={5} fill="var(--ink)" stroke="var(--raised)" strokeWidth={2} />
        <text x={CX} y={CY + 22} textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize={10.5} fill="var(--muted)">
          {t("checkin.you")}
        </text>
      </svg>
      <span className={good ? "radar__accuracy mono" : "radar__accuracy radar__accuracy--weak mono"}>
        <Icon path={good ? mdiCheck : mdiAlertOutline} size={14} />
        {t(good ? "checkin.goodSignal" : "checkin.weakSignal", { meters: fix.accuracyMeters })}
      </span>
    </div>
  );
}
