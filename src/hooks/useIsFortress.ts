import { tierAllows, type MembershipTier } from '../lib/membership';
import { useProfileStore } from '../state/profileStore';

/**
 * This account's tier — the single place the rest of the app asks. Screens
 * read this rather than profiles.membership_tier directly, so when billing
 * arrives and membership stops being one column (trials, lapsed renewals,
 * grace periods) only this file has to change.
 */
export function useMembershipTier(): MembershipTier {
  return useProfileStore((s) => s.membershipTier);
}

/**
 * Whether this account can use something requiring `needs`.
 *
 * Comparison rather than equality: Keep includes everything in Fortress, so
 * asking "is your tier exactly fortress" would lock the top tier out of the
 * middle one's features — a bug that only shows up for the members paying
 * the most.
 */
export function useHasTier(needs: MembershipTier): boolean {
  return useProfileStore((s) => tierAllows(s.membershipTier, needs));
}

/** Kept as the common case, and now true for Keep members as well. */
export function useIsFortress(): boolean {
  return useHasTier('fortress');
}

export function useIsKeep(): boolean {
  return useHasTier('keep');
}
