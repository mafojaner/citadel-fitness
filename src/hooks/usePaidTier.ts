import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../state/authStore';
import type { MembershipTier } from '../lib/membership';

/**
 * The tier held through a store subscription, as opposed to the hand-granted
 * column.
 *
 * The two are deliberately different questions. `membershipTier` answers
 * "what can this account use", which is what every gate reads. This answers
 * "is there a subscription behind it", which only the plans page needs, and
 * only to decide whether to offer a way to cancel. Offering "manage
 * subscription" to someone granted Fortress by hand sends them to a store
 * page that has never heard of them.
 *
 * Reads the member's own row, which is all the RLS policy on `subscriptions`
 * permits -- there is no client write policy of any kind, so this can report
 * a subscription and never create one.
 */
export function usePaidTier(enabled: boolean) {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [paidTier, setPaidTier] = useState<MembershipTier | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    // Skipped entirely while billing cannot complete, which is every build
    // today: there is nothing to find, and asking would be a request per
    // visit to the plans page for a table that is empty by construction.
    Promise.resolve(
      enabled && userId
        ? supabase
            .from('subscriptions')
            .select('tier, status')
            .eq('user_id', userId)
            .maybeSingle()
        : null
    )
      .then((result) => {
        if (cancelled || !result) return;
        const row = result.data as { tier: MembershipTier; status: string } | null;
        // Only a live subscription counts. An expired or refunded row is a
        // record of something that ended, and offering to manage it would
        // send someone to cancel what they no longer have.
        const live = row && (row.status === 'active' || row.status === 'grace');
        setPaidTier(live ? row.tier : null);
      })
      .catch(() => {
        if (!cancelled) setPaidTier(null);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);

  // A plain effect rather than useFocusEffect, unlike most hooks here.
  //
  // Two reasons. A subscription does not change while you are looking at
  // another screen, so refetching on focus would buy nothing. And
  // useFocusEffect requires a navigation context, which made the plans
  // screen's own tests fail for a reason that had nothing to do with what
  // they test -- weakening a test to accommodate a hook that did not need
  // the behaviour would have been the wrong way round.
  //
  // `reload` is returned so the purchase flow can refresh explicitly, which
  // is the one moment this value actually changes.
  useEffect(load, [load]);

  return { paidTier, reload: load };
}
