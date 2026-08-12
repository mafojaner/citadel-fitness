import { useProfileStore } from '../state/profileStore';

/**
 * Whether this account has Fortress. The single place the rest of the app
 * asks — screens read this rather than profiles.fortress_since directly, so
 * when billing arrives and membership stops being one nullable column
 * (trials, lapsed renewals, grace periods) only this has to change.
 *
 * Note that no premium feature is built yet: today this only decides whether
 * a feature's entry point reads as "locked, upgrade" or "yours, coming
 * soon". See FortressFeatureCard.
 */
export function useIsFortress(): boolean {
  return useProfileStore((s) => s.fortressSince !== null);
}
