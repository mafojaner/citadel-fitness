import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { stalledCount, useOfflineQueueStore } from '../state/offlineQueueStore';
import { useTheme } from '../theme/useTheme';

/**
 * That there is work waiting to reach the server.
 *
 * Offline sync is the one Fortress feature you can only notice when it
 * breaks: it works continuously and silently, so it earns no credit for
 * working, and the first sign anything was queued used to be a failure
 * notice buried in the account centre. A feature nobody can see is a feature
 * nobody believes they are paying for.
 *
 * Draws nothing when the queue is empty, which is almost always. This is a
 * status line, not a permanent badge -- a card reading "0 workouts waiting"
 * on every launch would be worse than silence.
 *
 * Deliberately not an error. A queued save is the feature behaving
 * correctly; the alarming case is a stalled one, which reads differently and
 * points at the account centre where it can actually be dealt with.
 */
export function PendingSyncNotice() {
  const { colors, spacing, radius, typography } = useTheme();
  const queue = useOfflineQueueStore((s) => s.queue);

  if (queue.length === 0) return null;

  const stalled = stalledCount(queue);
  const waiting = queue.length - stalled;

  // A stalled item has run out of attempts and will not retry on its own, so
  // it is the one worth colouring. Anything still retrying is just weather.
  const tint = stalled > 0 ? colors.danger : colors.textSecondary;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.sm,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: stalled > 0 ? colors.danger : colors.border,
        backgroundColor: colors.surface,
      }}
      accessibilityRole="text"
    >
      <Ionicons
        name={stalled > 0 ? 'alert-circle-outline' : 'cloud-upload-outline'}
        size={16}
        color={tint}
      />
      <Text style={[typography.caption, { flex: 1, minWidth: 0, color: tint }]}>
        {stalled > 0
          ? `${stalled} workout${stalled === 1 ? '' : 's'} could not be uploaded. Open Account to retry.`
          : `${waiting} workout${waiting === 1 ? '' : 's'} saved here, uploading when you are back online.`}
      </Text>
    </View>
  );
}
