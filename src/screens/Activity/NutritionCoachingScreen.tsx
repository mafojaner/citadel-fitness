import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { PlainButton } from '../../components/PlainButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useNutritionIntakes } from '../../hooks/useNutritionIntakes';
import {
  nutritionStatusLabel,
  submitNutritionIntake,
  withdrawNutritionIntake,
  type NutritionIntake,
} from '../../lib/nutrition';
import { useProfileStore } from '../../state/profileStore';
import { useTheme } from '../../theme/useTheme';

/**
 * Tell a coach what you are after; they write the targets back.
 *
 * The form asks one required question and five optional ones. That split is
 * the design: a required height and weight is a wall in front of the
 * feature for anyone who does not want to give them, and a coach reading
 * "I keep gassing out on the last set" learns more than a dropdown labelled
 * "goal: endurance" ever tells them.
 *
 * Only one conversation runs at a time, which the database enforces. While
 * one is open the form is replaced by it, rather than sitting underneath
 * greyed out -- a form you cannot submit is a worse explanation than the
 * plan you are already waiting on.
 */
function IntakeCard({
  intake,
  onWithdraw,
}: {
  intake: NutritionIntake;
  onWithdraw: (id: string) => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const answered = intake.status === 'answered';

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={[typography.subheading, { color: colors.textPrimary }]}>{intake.goal}</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Sent {new Date(intake.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            borderWidth: 1,
            borderColor: answered ? colors.success : colors.border,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: 2,
          }}
        >
          {answered ? <Ionicons name="checkmark-circle" size={11} color={colors.success} /> : null}
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: answered ? colors.success : colors.textSecondary,
            }}
          >
            {nutritionStatusLabel(intake.status)}
          </Text>
        </View>
      </View>

      {intake.coachPlan ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: spacing.sm,
            gap: spacing.xs,
          }}
        >
          <Text style={[typography.caption, { color: colors.textMuted }]}>Your plan</Text>
          <Text style={[typography.body, { color: colors.textPrimary }]}>{intake.coachPlan}</Text>
        </View>
      ) : null}

      {intake.status === 'submitted' ? (
        <PlainButton
          label="Withdraw"
          onPress={() => onWithdraw(intake.id)}
          palette={{ background: 'transparent', ink: colors.textMuted, border: colors.border }}
        />
      ) : null}
    </Card>
  );
}

export function NutritionCoachingScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const { intakes, openIntake, loading, error, reload } = useNutritionIntakes();
  const units = useProfileStore((s) => s.preferences.units);

  const [goal, setGoal] = useState('');
  const [weight, setWeight] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [typicalDay, setTypicalDay] = useState('');
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const field = {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
  } as const;

  const send = async () => {
    if (goal.trim().length === 0) return;
    setBusy(true);
    setSendError(null);
    try {
      // Parsed rather than sent as text, and left null when it is not a
      // number: a coach reading "about 80ish" as a weight is worse than a
      // coach reading nothing and asking.
      const parsedWeight = Number.parseFloat(weight.replace(',', '.'));
      await submitNutritionIntake({
        goal,
        bodyWeightKg: Number.isFinite(parsedWeight) ? parsedWeight : null,
        restrictions: restrictions.trim() || undefined,
        typicalDay: typicalDay.trim() || undefined,
      });
      setGoal('');
      setWeight('');
      setRestrictions('');
      setTypicalDay('');
      reload();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Could not send that');
    } finally {
      setBusy(false);
    }
  };

  const onWithdraw = async (id: string) => {
    try {
      await withdrawNutritionIntake(id);
      reload();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Could not withdraw that');
    }
  };

  const answered = intakes.filter((i) => i.status === 'answered');

  return (
    <ScreenContainer>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <ErrorNotice message={error} onRetry={reload} />
      ) : (
        <>
          {openIntake ? (
            <>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                One plan at a time, so a coach is never writing two for you at once. Withdraw this
                one if what you want has changed.
              </Text>
              <IntakeCard intake={openIntake} onWithdraw={onWithdraw} />
            </>
          ) : (
            <Card>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                Tell a coach what you are training for and what you actually eat. Only the first
                question is required &mdash; the rest help, and none of it is guessed at if you leave
                it out.
              </Text>

              <TextInput
                placeholder="What are you after?"
                placeholderTextColor={colors.textMuted}
                value={goal}
                onChangeText={setGoal}
                multiline
                style={[field, { minHeight: 80, textAlignVertical: 'top' }]}
              />
              <TextInput
                placeholder={`Body weight (${units}, optional)`}
                placeholderTextColor={colors.textMuted}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                style={field}
              />
              <TextInput
                placeholder="Anything you don't eat (optional)"
                placeholderTextColor={colors.textMuted}
                value={restrictions}
                onChangeText={setRestrictions}
                style={field}
              />
              <TextInput
                placeholder="A typical day of eating (optional)"
                placeholderTextColor={colors.textMuted}
                value={typicalDay}
                onChangeText={setTypicalDay}
                multiline
                style={[field, { minHeight: 90, textAlignVertical: 'top' }]}
              />

              {sendError ? <ErrorNotice message={sendError} onRetry={send} /> : null}

              <PlainButton
                label={busy ? 'Sending...' : 'Send to a coach'}
                loading={busy}
                disabled={goal.trim().length === 0}
                onPress={send}
              />
            </Card>
          )}

          {answered.length > 0 ? (
            <>
              <Text style={[typography.subheading, { color: colors.textPrimary }]}>
                Previous plans
              </Text>
              <View style={{ gap: spacing.md }}>
                {answered.map((intake) => (
                  <IntakeCard key={intake.id} intake={intake} onWithdraw={onWithdraw} />
                ))}
              </View>
            </>
          ) : null}
        </>
      )}
    </ScreenContainer>
  );
}
