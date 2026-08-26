import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { ScreenContainer } from '../../components/ScreenContainer';
import {
  ARTICLE_CATEGORY_ICONS,
  ARTICLE_CATEGORY_LABELS,
} from '../../constants/articles';
import {
  cancelDailyReminder,
  requestNotificationPermission,
  scheduleDailyReminder,
} from '../../lib/notifications';
import { useIsFortress } from '../../hooks/useMembership';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import type { ArticleCategory } from '../../types/models';
import { useTheme } from '../../theme/useTheme';

export function NotificationsScreen() {
  const { colors, spacing, typography } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const isFortress = useIsFortress();
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

  const onToggleWeeklyDigest = async (weeklyDigest: boolean) => {
    if (!userId) return;
    setError(null);
    try {
      await savePreferences(userId, { weeklyDigest });
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
          <Ionicons name="notifications" size={22} color={colors.textSecondary} />
          <Text style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>
            Workout reminders
          </Text>
          <Switch
            accessibilityLabel="Workout reminders"
            value={preferences.notifications}
            onValueChange={onToggleNotifications}
            trackColor={{ false: colors.border, true: colors.textPrimary }}
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
            <Ionicons name={ARTICLE_CATEGORY_ICONS[category]} size={18} color={colors.textSecondary} />
            <Text style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>
              {ARTICLE_CATEGORY_LABELS[category]}
            </Text>
            <Switch
              // Names the category, since a screen reader otherwise reads
              // five identical "switch, on" rows in a row here.
              accessibilityLabel={`${ARTICLE_CATEGORY_LABELS[category]} article alerts`}
              value={preferences.notifications && preferences.articleNotifications[category]}
              disabled={!preferences.notifications}
              onValueChange={(value) => onToggleArticleCategory(category, value)}
              trackColor={{ false: colors.border, true: colors.textPrimary }}
              thumbColor={colors.surface}
            />
          </View>
        ))}
      </Card>

      <Card title="Email updates">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Ionicons name="mail" size={22} color={colors.textSecondary} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[typography.body, { color: colors.textPrimary }]}>
              Email me about new articles &amp; app news
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Sent to your account email, separate from the push notifications above.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Email me about new articles and app news"
            value={preferences.emailNewsletter}
            onValueChange={onToggleEmailNewsletter}
            trackColor={{ false: colors.border, true: colors.textPrimary }}
            thumbColor={colors.surface}
          />
        </View>

        {/* Only for members: the digest is a Fortress feature, and offering
            a switch that silently does nothing is worse than not offering
            it. Free accounts see the feature card on the Account screen
            instead, which explains what it is. */}
        {isFortress ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingTop: spacing.sm,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Ionicons name="mail-unread" size={22} color={colors.textSecondary} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={[typography.body, { color: colors.textPrimary }]}>
                Weekly digest
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                A Sunday recap of your week and what to aim at next. Skipped entirely on a
                week you didn&apos;t train.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Weekly digest email"
              value={preferences.weeklyDigest}
              onValueChange={onToggleWeeklyDigest}
              trackColor={{ false: colors.border, true: colors.textPrimary }}
              thumbColor={colors.surface}
            />
          </View>
        ) : null}
      </Card>

      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
    </ScreenContainer>
  );
}
