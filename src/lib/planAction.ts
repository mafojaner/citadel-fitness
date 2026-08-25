import type { WaitlistTier } from './fortress';
import { tierAllows, type MembershipTier } from './membership';

/**
 * What a plan card offers, as a value rather than as JSX.
 *
 * Pulled out of the screen so the rule can be tested. It is not a
 * presentation detail: it decides whether someone is shown a way to pay,
 * and getting it wrong in either direction is a real failure — offering a
 * plan to someone who already holds it, or hiding it from someone who
 * doesn't. Today the offer is a waitlist; when billing exists this same
 * decision picks between "buy", "manage" and "nothing to do", so it is
 * worth having a test around it before money depends on it.
 */
export type PlanAction =
  /** Free plan, or one this account already holds. */
  | { kind: 'none' }
  /** Waitlist status not known yet. */
  | { kind: 'loading' }
  /** Already on the list — for this plan or another one. */
  | { kind: 'joined' }
  /** The signup form, open on this plan. */
  | { kind: 'form'; tier: WaitlistTier }
  /** The offer itself. */
  | { kind: 'button'; tier: WaitlistTier };

export function planAction({
  tier,
  currentTier,
  loading,
  joined,
  openTier,
}: {
  tier: MembershipTier;
  currentTier: MembershipTier;
  loading: boolean;
  joined: boolean;
  openTier: WaitlistTier | null;
}): PlanAction {
  // Nothing to wait for on a plan you already hold, and nothing to buy on
  // the free one. Note this is `tierAllows`, not equality: a Valhalla member
  // holds Fortress too, so the Fortress card must not offer them anything.
  if (tier === 'free' || tierAllows(currentTier, tier)) return { kind: 'none' };

  // Checked before `joined` on purpose. While the status is still loading,
  // `joined` is false, and treating that as "not on the list" would flash a
  // signup button at someone who already signed up.
  if (loading) return { kind: 'loading' };

  // One row per person, not per plan, so being on the list at all suppresses
  // the offer on every unheld plan. The notice itself explains which plan
  // they chose.
  if (joined) return { kind: 'joined' };

  const waitlistTier = tier as WaitlistTier;
  return openTier === waitlistTier
    ? { kind: 'form', tier: waitlistTier }
    : { kind: 'button', tier: waitlistTier };
}
