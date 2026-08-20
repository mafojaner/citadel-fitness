/**
 * The three membership tiers, and the one rule for comparing them.
 *
 * Free → Fortress → Keep, where "Keep" is the innermost tower of a
 * fortification: above Fortress rather than beside it. The split between
 * the paid two is marginal cost per member per month, not difficulty.
 * Fortress is everything software serves for effectively nothing extra per
 * person. Keep is where a human is on the other end — a coach reviewing
 * video, a same-day reply — so every member there costs real hours, which
 * is also why it needs a capacity cap that Fortress never will.
 *
 * Ordered rather than a set of flags: membership is one state, and "which
 * tier are you" should have exactly one answer that can't contradict
 * itself. Access is `rank(you) >= rank(feature)`, so a Keep member gets
 * everything in Fortress without that having to be listed anywhere.
 */
export type MembershipTier = 'free' | 'fortress' | 'keep';

const TIER_RANK: Record<MembershipTier, number> = {
  free: 0,
  fortress: 1,
  keep: 2,
};

export const TIER_LABELS: Record<MembershipTier, string> = {
  free: 'Free',
  fortress: 'Fortress',
  keep: 'Keep',
};

export function tierRank(tier: MembershipTier): number {
  return TIER_RANK[tier] ?? 0;
}

/** Whether a member on `has` can use something requiring `needs`. */
export function tierAllows(has: MembershipTier, needs: MembershipTier): boolean {
  return tierRank(has) >= tierRank(needs);
}

/** Narrows an unknown string from the database, defaulting to the safe end. */
export function parseTier(value: string | null | undefined): MembershipTier {
  return value === 'fortress' || value === 'keep' ? value : 'free';
}
