import { REACTION_KINDS, type ReactionKind, type Reactions } from "@/api/types";

/** What a visit's reactions become once yours changes, before the server answers. */
export function guessReactions(current: Reactions, next: ReactionKind | null): Reactions {
  const counts = new Map(current.counts.map((row) => [row.kind, row.count]));
  if (current.mine) counts.set(current.mine, (counts.get(current.mine) ?? 1) - 1);
  if (next) counts.set(next, (counts.get(next) ?? 0) + 1);
  return {
    counts: REACTION_KINDS.filter((kind) => (counts.get(kind) ?? 0) > 0).map((kind) => ({ kind, count: counts.get(kind) ?? 0 })),
    mine: next,
  };
}
