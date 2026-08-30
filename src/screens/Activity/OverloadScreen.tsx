import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useOverloadSuggestions } from '../../hooks/useOverloadSuggestions';
import {
  actionLabel,
  confidenceLabel,
  isCaution,
  type OverloadSuggestion,
} from '../../lib/overload';
import { useTheme } from '../../theme/useTheme';

/**
 * What to do next on every lift you have been training.
 *
 * Flat, in the account centre's language: no gradient badges, no tinted
 * glow, colour reduced to a single mark. That is not only for consistency.
 * This screen is a list of instructions about loading a barbell, and the
 * row that says "back off" has to be able to stand out from the rows that
 * say "add weight" -- which it cannot do if every row is already shouting.
 *
 * Every row shows its reasoning. The catalogue sells this as "AI", and what
 * it actually is is double progression with an RPE brake, decided in
 * get_overload_suggestions. A suggestion you cannot interrogate is one you
 * stop trusting the first time it is wrong, and this one is about how much
 * weight to put over your own chest.
 */
function SuggestionRow({ item }: { item: OverloadSuggestion }) {
  const { colors, spacing, radius, typography } = useTheme();
  const caution = isCaution(item.action);
  // The one spot of colour on the row, and it is spent on the rows arguing
  // against what the lifter probably wants to do. Everything else stays ink.
  const mark = caution ? colors.danger : colors.textMuted;

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={[typography.subheading, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.exerciseName}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Last: {item.lastWeight} {item.unit} × {item.lastReps}
            {item.lastRpe != null ? ` · RPE ${item.lastRpe}` : ''}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            borderWidth: 1,
            borderColor: caution ? mark : colors.border,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: 2,
          }}
        >
          {caution ? <Ionicons name="alert-circle" size={11} color={mark} /> : null}
          <Text style={{ fontSize: 10, fontWeight: '700', color: caution ? mark : colors.textSecondary }}>
            {actionLabel(item.action)}
          </Text>
        </View>
      </View>

      {/* The number, given the room it deserves: this is the whole answer,
          and burying it in a sentence would make it something you have to
          read rather than something you can glance at between sets. */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
        <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: '700' }}>
          {item.suggestedWeight}
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          {item.unit} × {item.suggestedReps}
        </Text>
      </View>

      <Text style={[typography.body, { color: colors.textSecondary }]}>{item.rationale}</Text>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: spacing.sm,
        }}
      >
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {confidenceLabel(item.confidence, item.sessions)}
        </Text>
      </View>
    </Card>
  );
}

export function OverloadScreen() {
  const { colors, spacing, typography } = useTheme();
  const { suggestions, loading, error, reload } = useOverloadSuggestions();

  return (
    <ScreenContainer>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <ErrorNotice message={error} onRetry={reload} />
      ) : suggestions.length === 0 ? (
        <Card>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Nothing to suggest yet. A lift needs at least two logged sessions in the last 90 days
            before there is a trend worth reading — keep logging and it will fill in.
          </Text>
        </Card>
      ) : (
        <>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Worked out from your own logged sessions, not a model. Every row says why, so you can
            disagree with it — how the set actually felt beats any of this.
          </Text>
          <View style={{ gap: spacing.md }}>
            {suggestions.map((item) => (
              <SuggestionRow key={item.exerciseId} item={item} />
            ))}
          </View>
        </>
      )}
    </ScreenContainer>
  );
}
