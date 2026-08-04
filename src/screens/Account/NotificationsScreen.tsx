import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { ScreenContainer } from '../../components/ScreenContainer';
import {
  ARTICLE_CATEGORY_GRADIENTS,
  ARTICLE_CATEGORY_ICONS,
  ARTICLE_CATEGORY_LABELS,
} from '../../constants/articles';
import {
  cancelDailyReminder,
  requestNotificationPermission,
  scheduleDailyReminder,
} from '../../lib/notifications';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import type { ArticleCategory } from '../../types/models';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export function NotificationsScreen() {
  const { colors, spacing, typography } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const preferences = useProfileStore((s) => s.preferences);
  const savePreferences = useProfileStore((s) => s.savePreferences);
  const [error, setError] = useState<string | null>(null);

  const onToggleNotifications = async (notifications: boolean) => {
    if (!userId) return;
    setError(null);
    try {
      if (notifications) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          setError('Notification permission was denied. Enable it in your device settings to get reminders.');
          return;
        }
        await scheduleDailyReminder();
      } else {
        await cancelDailyReminder();
      }
      await savePreferences(userId, { notifications });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preference');
    }
  };

  const onToggleArticleCategory = async (category: ArticleCategory, value: boolean) => {
    if (!userId) return;
    setError(null);
    try {
      await savePreferences(userId, {
        articleNotifications: { ...preferences.articleNotifications, [category]: value },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preference');
    }
  };

  const onToggleEmailNewsletter = async (emailNewsletter: boolean) => {
    if (!userId) return;
    setError(null);
    try {
      await savePreferences(userId, { emailNewsletter });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preference');
    }
  };

  return (
    <ScreenContainer>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <GradientIconBadge icon="notifications" colors={gradients.flame} size={32} />
          <Text style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>
            Workout reminders
          </Text>
          <Switch
            value={preferences.notifications}
            onValueChange={onToggleNotifications}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>
      </Card>

      <Card title="Newsletter alerts">
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {preferences.notifications
            ? 'Which categories should notify you when something new is published.'
            : 'Turn on workout reminders above to enable newsletter alerts.'}
        </Text>
        {(Object.keys(ARTICLE_CATEGORY_LABELS) as ArticleCategory[]).map((category) => (
          <View key={category} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <GradientIconBadge
              icon={ARTICLE_CATEGORY_ICONS[category]}
              colors={ARTICLE_CATEGORY_GRADIENTS[category]}
              size={28}
            />
            <Text style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>
              {ARTICLE_CATEGORY_LABELS[category]}
            </Text>
            <Switch
              value={preferences.notifications && preferences.articleNotifications[category]}
              disabled={!preferences.notifications}
              onValueChange={(value) => onToggleArticleCategory(category, value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        ))}
      </Card>

      <Card title="Email updates">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <GradientIconBadge icon="mail" colors={gradients.identity} size={32} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[typography.body, { color: colors.textPrimary }]}>
              Email me about new articles &amp; app news
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Sent to your account email — separate from the push notifications above.
            </Text>
          </View>
          <Switch
            value={preferences.emailNewsletter}
            onValueChange={onToggleEmailNewsletter}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>
      </Card>

      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
    </ScreenContainer>
  );
}
