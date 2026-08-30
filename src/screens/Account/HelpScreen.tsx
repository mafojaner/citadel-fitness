import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { PlainButton } from '../../components/PlainButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { submitFeedback } from '../../lib/feedback';
import { useHasTier } from '../../hooks/useMembership';
import { useAuthStore } from '../../state/authStore';
import { useTheme } from '../../theme/useTheme';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'How do I log a workout?',
    answer:
      'Tap "Log workout" on Home, or open the Workouts tab, add exercises from the catalogue, fill in your sets, then tap Confirm.',
  },
  {
    question: 'Can I edit or delete a past workout?',
    answer: 'Yes, open any day on the Workouts calendar to edit or remove what you logged for that day.',
  },
  {
    question: 'How do streaks work?',
    answer:
      'Your current streak counts consecutive days with at least one logged workout containing real values; it resets if a day is missed.',
  },
  {
    question: 'How do I change my units (lb/kg, mi/km)?',
    answer:
      'Go to Account → Units and choose your preferred weight and distance units. This updates how weights and distances are shown throughout the app.',
  },
  {
    question: 'How do I turn on notifications?',
    answer:
      'Go to Account → Notifications to enable workout reminders, per-category newsletter alerts, and email updates.',
  },
  {
    question: 'What are Fortress and Valhalla?',
    answer:
      "They're Citadel Fitness's two upcoming paid plans, on top of the free tier everyone has. Fortress covers what you did: records, analytics, export, programs and groups. Valhalla adds what to do next, including coached nutrition and form-check reviews by a real person. Neither is on sale yet. Open Account, then Plans, to compare them and join the waitlist.",
  },
  {
    question: 'Is my data private?',
    answer: 'Yes, read the full details in our Privacy Policy, linked from Account → Privacy policy.',
  },
  {
    question: 'How do I reset my password?',
    answer: 'From the sign-in screen, tap "Forgot password?" and follow the link emailed to you.',
  },
  {
    question: 'How do I delete my account?',
    answer:
      "Go to Account → Account management → Delete account. This permanently removes your account, workout history, and profile; there's no way to undo it.",
  },
];

function FaqRow({ item }: { item: FaqItem }) {
  const { colors, spacing, typography } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <AnimatedPressable
      onPress={() => setOpen((v) => !v)}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={item.question}
    >
      <View style={{ paddingVertical: spacing.sm, gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600', flex: 1, minWidth: 0 }]}>
            {item.question}
          </Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
        </View>
        {open ? <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.answer}</Text> : null}
      </View>
    </AnimatedPressable>
  );
}

export function HelpScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const email = useAuthStore((s) => s.session?.user.email);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Priority support is a Valhalla feature, so this is the tier that
  // decides whether the promise below is true for this account.
  const hasPrioritySupport = useHasTier('valhalla');

  const canSubmit = message.trim().length > 0;

  const onSubmit = async () => {
    if (!canSubmit || !userId || !email) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitFeedback(userId, email, message.trim());
      setMessage('');
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Card title="Frequently asked questions">
        {FAQS.map((item, index) => (
          <View key={item.question}>
            <FaqRow item={item} />
            {index < FAQS.length - 1 ? (
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
            ) : null}
          </View>
        ))}
      </Card>

      <Card title="Send feedback">
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Found a bug, or have an idea? Tell us, this goes straight to the team.
        </Text>
        <TextInput
          placeholder="What's on your mind?"
          placeholderTextColor={colors.textMuted}
          value={message}
          onChangeText={(t) => {
            setMessage(t);
            setSent(false);
          }}
          multiline
          numberOfLines={5}
          style={{
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.md,
            padding: spacing.md,
            color: colors.textPrimary,
            minHeight: 110,
            textAlignVertical: 'top',
          }}
        />
        {error ? <ErrorNotice message={error} onRetry={onSubmit} /> : null}
        {sent ? (
          <Text style={{ color: colors.success }}>
            {hasPrioritySupport
              ? 'Thanks, your feedback was sent. It goes to the front of the queue.'
              : 'Thanks, your feedback was sent.'}
          </Text>
        ) : null}

        {/* Said before sending, not only after. A member who paid for
            priority support should know it applies while deciding whether
            to bother writing, which is the moment the tier is worth
            anything to them. Shown only to accounts that actually have it:
            telling everyone would make it a slogan rather than a fact. */}
        {hasPrioritySupport && !sent ? (
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Your plan includes priority support, so this is answered ahead of other messages.
          </Text>
        ) : null}
        <PlainButton
          label={submitting ? 'Sending...' : 'Send feedback'}
          loading={submitting}
          disabled={!canSubmit}
          onPress={onSubmit}
        />
      </Card>
    </ScreenContainer>
  );
}
