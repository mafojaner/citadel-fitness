import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ARTICLE_CATEGORY_LABELS } from '../constants/articles';
import { fetchArticlesSince } from './articles';
import type { ArticleCategory } from '../types/models';

const DAILY_REMINDER_ID = 'daily-workout-reminder';
const DEFAULT_HOUR = 18;
const DEFAULT_MINUTE = 0;
const LAST_SEEN_KEY = 'citadel-fitness-articles-last-seen';
/** Guards against a backlog of old posts all firing at once on first run. */
const MAX_ARTICLE_NOTIFICATIONS = 3;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

// Local (on-device) scheduling isn't implemented for web — the browser has no
// persistent OS-level scheduler for a page that may not stay open. Permission
// requests still work there; scheduling is just a no-op.
export async function scheduleDailyReminder(
  hour = DEFAULT_HOUR,
  minute = DEFAULT_MINUTE
): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: 'Time to train',
      body: "You haven't logged a workout today — keep the streak going.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
}

/**
 * Notifies about newsletter articles published since the last check, one
 * notification per article, titled with its category so the alert matches
 * the card it points at.
 *
 * Called when the app comes to the foreground rather than on a schedule:
 * without a push server the device can't learn about new content on its
 * own, so "when you next open the app" is the only honest trigger.
 *
 * Returns the number of notifications raised.
 */
export async function notifyNewArticles(
  enabledCategories: Record<ArticleCategory, boolean>
): Promise<number> {
  const lastSeen = await AsyncStorage.getItem(LAST_SEEN_KEY);

  // First run: record the current time and stay quiet, so installing the
  // app doesn't immediately fire a notification for every back-catalogue post.
  if (!lastSeen) {
    await AsyncStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    return 0;
  }

  const articles = await fetchArticlesSince(lastSeen);
  if (articles.length === 0) return 0;

  // Advance the marker past everything fetched, even categories the user
  // muted — otherwise muting a category would keep re-checking its posts.
  const newest = articles[articles.length - 1].publishedAt;
  await AsyncStorage.setItem(LAST_SEEN_KEY, newest);

  if (Platform.OS === 'web') return 0;

  const toNotify = articles
    .filter((a) => enabledCategories[a.category])
    .slice(-MAX_ARTICLE_NOTIFICATIONS);

  for (const article of toNotify) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `New in ${ARTICLE_CATEGORY_LABELS[article.category]}`,
        body: article.title,
        data: { articleId: article.id, category: article.category },
      },
      trigger: null, // present immediately
    });
  }

  return toNotify.length;
}

/** Test seam + used when signing out, so the next user starts clean. */
export async function resetArticleNotificationMarker(): Promise<void> {
  await AsyncStorage.removeItem(LAST_SEEN_KEY);
}
