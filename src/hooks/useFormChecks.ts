import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  fetchFormCheckQuota,
  fetchFormChecks,
  type FormCheckQuota,
  type FormCheckSubmission,
} from '../lib/formCheck';
import { useAuthStore } from '../state/authStore';

/**
 * The member's own submissions and what is left of this month's allowance.
 *
 * Both are fetched together because the screen is unusable with one of them:
 * a list with no allowance cannot say whether you may send another, and an
 * allowance with no list cannot say what you spent it on.
 */
export function useFormChecks() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [submissions, setSubmissions] = useState<FormCheckSubmission[]>([]);
  const [quota, setQuota] = useState<FormCheckQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) return () => {};
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([fetchFormChecks(userId), fetchFormCheckQuota()])
      .then(([rows, q]) => {
        if (cancelled) return;
        setSubmissions(rows);
        setQuota(q);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load your form checks');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useFocusEffect(load);

  return { submissions, quota, loading, error, reload: load };
}
