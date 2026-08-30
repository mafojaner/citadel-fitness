import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Text, TextInput, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { PlainButton } from '../../components/PlainButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useExercises } from '../../hooks/useExercises';
import { useFormChecks } from '../../hooks/useFormChecks';
import {
  formCheckVideoUrl,
  formatQuotaReset,
  statusLabel,
  submitFormCheck,
  withdrawFormCheck,
  type FormCheckSubmission,
} from '../../lib/formCheck';
import { useAuthStore } from '../../state/authStore';
import { useTheme } from '../../theme/useTheme';

/**
 * Send a coach a video of a set and get it back with notes.
 *
 * The screen leads with what is left of the month rather than with the
 * upload button. This is the one feature in the app with a hard limit on it,
 * because it costs a person's time rather than server time, and a limit
 * discovered after filming and uploading is a limit that feels like a bug.
 */
function SubmissionRow({
  item,
  exerciseName,
  onWithdraw,
}: {
  item: FormCheckSubmission;
  /** Null when no lift was attached, or when the catalogue has not loaded. */
  exerciseName: string | null;
  onWithdraw: (id: string) => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const [opening, setOpening] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const reviewed = item.status === 'reviewed';

  const openVideo = async () => {
    setOpening(true);
    setLinkError(null);
    try {
      const url = await formCheckVideoUrl(item.videoPath);
      await Linking.openURL(url);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Could not open that video');
    } finally {
      setOpening(false);
    }
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={[typography.subheading, { color: colors.textPrimary }]} numberOfLines={1}>
            {exerciseName ?? 'Form check'}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Sent {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            borderWidth: 1,
            borderColor: reviewed ? colors.success : colors.border,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: 2,
          }}
        >
          {reviewed ? <Ionicons name="checkmark-circle" size={11} color={colors.success} /> : null}
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: reviewed ? colors.success : colors.textSecondary,
            }}
          >
            {statusLabel(item.status)}
          </Text>
        </View>
      </View>

      {item.note ? (
        <Text style={[typography.body, { color: colors.textSecondary }]}>&ldquo;{item.note}&rdquo;</Text>
      ) : null}

      {item.reviewerNotes ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: spacing.sm,
            gap: spacing.xs,
          }}
        >
          <Text style={[typography.caption, { color: colors.textMuted }]}>What the coach said</Text>
          <Text style={[typography.body, { color: colors.textPrimary }]}>{item.reviewerNotes}</Text>
        </View>
      ) : null}

      {linkError ? <ErrorNotice message={linkError} onRetry={openVideo} /> : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <PlainButton
            label={opening ? 'Opening...' : 'Watch it back'}
            loading={opening}
            onPress={openVideo}
            palette={{ background: 'transparent', ink: colors.textPrimary, border: colors.border }}
          />
        </View>
        {item.status === 'submitted' ? (
          <View style={{ flex: 1 }}>
            {/* Only before a coach has started. Once a review is under way the
                time has been spent, and taking the slot back would be taking
                it from the person who did the work. */}
            <PlainButton
              label="Withdraw"
              onPress={() => onWithdraw(item.id)}
              palette={{ background: 'transparent', ink: colors.textMuted, border: colors.border }}
            />
          </View>
        ) : null}
      </View>
    </Card>
  );
}

export function FormCheckScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { submissions, quota, loading, error, reload } = useFormChecks();
  const { exercises } = useExercises();
  // Resolved here rather than joined server-side: the catalogue is already
  // loaded on this device for the logging flow, and sending the name back
  // with every submission would duplicate a row the client holds.
  const exerciseNames = useMemo(
    () => new Map(exercises.map((e) => [e.id, e.name])),
    [exercises]
  );
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const outOfReviews = quota != null && quota.remaining === 0;

  const pickAndSend = async () => {
    if (!userId) return;
    setSendError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setSendError('Citadel Fitness needs access to your photo library to send a video.');
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: false,
    });
    if (picked.canceled || picked.assets.length === 0) return;

    const asset = picked.assets[0];
    setBusy(true);
    try {
      await submitFormCheck({
        userId,
        uri: asset.uri,
        mimeType: asset.mimeType,
        note: note.trim() || undefined,
      });
      setNote('');
      reload();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Could not send that video');
    } finally {
      setBusy(false);
    }
  };

  const onWithdraw = async (id: string) => {
    try {
      await withdrawFormCheck(id);
      reload();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Could not withdraw that submission');
    }
  };

  return (
    <ScreenContainer>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <ErrorNotice message={error} onRetry={reload} />
      ) : (
        <>
          <Card>
            {/* The allowance first, before the button. A limit found out
                after filming and uploading reads as a bug rather than a
                plan. */}
            {quota ? (
              <View style={{ gap: spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: '700' }}>
                    {quota.remaining}
                  </Text>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>
                    of {quota.allowance} reviews left this month
                  </Text>
                </View>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Resets on {formatQuotaReset(quota.resetsAt)}. A real person watches every
                  submission, which is why there is a limit at all.
                </Text>
              </View>
            ) : null}

            <TextInput
              placeholder="What do you want them to look at?"
              placeholderTextColor={colors.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.md,
                padding: spacing.md,
                color: colors.textPrimary,
                minHeight: 80,
                textAlignVertical: 'top',
              }}
            />

            {sendError ? <ErrorNotice message={sendError} onRetry={pickAndSend} /> : null}

            <PlainButton
              label={busy ? 'Sending...' : outOfReviews ? 'No reviews left this month' : 'Send a video'}
              loading={busy}
              disabled={outOfReviews}
              onPress={pickAndSend}
            />
          </Card>

          {submissions.length === 0 ? (
            <Card>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                Nothing sent yet. Film a working set from the side, close enough to see the bar and
                far enough to see your whole body, and send it over.
              </Text>
            </Card>
          ) : (
            <View style={{ gap: spacing.md }}>
              {submissions.map((item) => (
                <SubmissionRow
                  key={item.id}
                  item={item}
                  exerciseName={item.exerciseId ? (exerciseNames.get(item.exerciseId) ?? null) : null}
                  onWithdraw={onWithdraw}
                />
              ))}
            </View>
          )}
        </>
      )}
    </ScreenContainer>
  );
}
