import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { notifyNewArticles } from '../lib/notifications';
import { useProfileStore } from '../state/profileStore';

/**
 * Checks for newly published articles when the app becomes active and
 * raises a local notification for each one in an enabled category.
 *
 * Runs on foreground rather than a timer: with no push server the device
 * has no way to hear about new content while closed.
 */
export function useArticleNotifications(enabled: boolean) {
  const articleNotifications = useProfileStore((s) => s.preferences.articleNotifications);
  const notificationsOn = useProfileStore((s) => s.preferences.notifications);
  const running = useRef(false);

  useEffect(() => {
    if (!enabled || !notificationsOn) return;

    const check = () => {
      if (running.current) return;
      running.current = true;
      notifyNewArticles(articleNotifications)
        .catch(() => {
          // A failed check is not worth surfacing — the Newsletter tab
          // shows its own error if articles genuinely can't be reached.
        })
        .finally(() => {
          running.current = false;
        });
    };

    check();

    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active') check();
    });

    return () => subscription.remove();
  }, [enabled, notificationsOn, articleNotifications]);
}
