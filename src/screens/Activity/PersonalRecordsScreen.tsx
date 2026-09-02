import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { CategoryFilterPicker } from '../../components/CategoryFilterPicker';
import { EmptyState } from '../../components/EmptyState';
import { PaidFeatureLink } from '../../components/PaidFeatureCard';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatChip } from '../../components/StatChip';
import {
  CATEGORY_GRADIENTS,
  DEFAULT_CATEGORY_GRADIENT,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_ICON,
} from '../../constants/categories';
import { useDataExport } from '../../hooks/useDataExport';
import { usePersonalRecords } from '../../hooks/usePersonalRecords';
import { todayISO } from '../../lib/analytics';
import { formatDuration } from '../../lib/units';
import { isRecentRecord, type PersonalRecord } from '../../lib/personalRecords';
import { useProfileStore } from '../../state/profileStore';
import type { Category } from '../../types/models';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { ActivityStackParamList } from '../../navigation/stacks/ActivityStack';

function formatDate(dateString: string | null) {
  if (!dateString) return null;
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface RecordLineProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  date: string | null;
}

function RecordLine({ icon, label, value, date }: RecordLineProps) {
  const { colors, spacing, typography } = useTheme();
  const on = formatDate(date);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Ionicons name={icon} size={15} color={colors.textMuted} />
      <Text style={[typography.caption, { color: colors.textSecondary, flex: 1, minWidth: 0 }]}>
        {label}
      </Text>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}>{value}</Text>
        {on ? <Text style={{ color: colors.textMuted, fontSize: 11 }}>{on}</Text> : null}
      </View>
    </View>
  );
}

/**
 * Every record is derived from logged sets rather than stored, so nothing
 * needs backfilling and a corrected workout corrects its records too. See
 * personalRecords.ts for the arithmetic.
 */
export function PersonalRecordsScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ActivityStackParamList>>();
  const weightUnit = useProfileStore((s) => s.preferences.units);
  const distanceUnit = useProfileStore((s) => s.preferences.distanceUnit);
  const { records, loading, error, reload } = usePersonalRecords();
  const { exporting, result: exportResult, run: runExport } = useDataExport();
  const [category, setCategory] = useState<Category | 'all'>('all');

  // Only the categories this member has actually logged. The catalogue's
  // picker lists all nine because you are choosing what to browse; here you
  // are filtering what exists, and offering "Boxing" to someone who has
  // never boxed just gives them an empty screen to back out of.
  const categories = useMemo(() => {
    const present = Array.from(new Set(records.map((r) => r.category))).sort();
    return [
      { label: 'All', value: 'all' as const },
      ...present.map((c) => ({ label: c[0].toUpperCase() + c.slice(1), value: c })),
    ];
  }, [records]);

  const visible = category === 'all' ? records : records.filter((r) => r.category === category);

  // Which of these are news.
  //
  // Every record already carried the date it was set, printed small under
  // its value, and the screen left you to read six dates and compare them to
  // today yourself. The one question a records screen exists to answer --
  // did I just set one? -- was the one it made you work for. Computed once
  // here rather than per card, since `today` should not be re-derived
  // halfway down a list that might straddle midnight.
  const today = todayISO();
  const freshIds = useMemo(
    () => new Set(records.filter((r) => isRecentRecord(r, today)).map((r) => r.exerciseId)),
    [records, today]
  );

  const renderRecord = (record: PersonalRecord) => {
    const cardio = record.type === 'cardio';
    const lines: RecordLineProps[] = cardio
      ? [
          {
            icon: 'time-outline',
            label: 'Longest session',
            value: formatDuration(record.longestDurationSeconds),
            date: record.longestDurationDate,
          },
          ...(record.farthestDistance > 0
            ? [
                {
                  icon: 'navigate-outline' as const,
                  label: 'Farthest distance',
                  value: `${record.farthestDistance} ${distanceUnit}`,
                  date: record.farthestDistanceDate,
                },
              ]
            : []),
          {
            icon: 'flame-outline',
            label: 'Best day',
            value: `${record.bestSessionValue} min`,
            date: record.bestSessionDate,
          },
        ]
      : [
          {
            icon: 'barbell-outline',
            label: 'Heaviest set',
            value: `${record.heaviestWeight} ${weightUnit} × ${record.heaviestWeightReps}`,
            date: record.heaviestWeightDate,
          },
          // Hidden rather than shown as zero when every set was too high-rep
          // to estimate from — an absent record reads better than a false one.
          ...(record.estimatedOneRepMax > 0
            ? [
                {
                  icon: 'trending-up-outline' as const,
                  label: 'Best est. 1RM',
                  value: `${record.estimatedOneRepMax} ${weightUnit}`,
                  date: record.estimatedOneRepMaxDate,
                },
              ]
            : []),
          {
            icon: 'flame-outline',
            label: 'Best day volume',
            value: `${record.bestSessionValue} ${weightUnit}`,
            date: record.bestSessionDate,
          },
        ];

    return (
      <Card key={record.exerciseId}>
        {/* The header opens the lift's own screen, where this record sits
            beside its goal and its progression. Those three were built on
            the same logged sets and had no route between them. */}
        <AnimatedPressable
          onPress={() =>
            navigation.navigate('LiftDetail', {
              exerciseId: record.exerciseId,
              exerciseName: record.exerciseName,
            })
          }
          scaleTo={0.99}
          accessibilityRole="button"
          accessibilityLabel={`${record.exerciseName}. Opens this lift's record, goal and progression.`}
        >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <GradientIconBadge
            icon={CATEGORY_ICONS[record.category] ?? DEFAULT_CATEGORY_ICON}
            colors={CATEGORY_GRADIENTS[record.category] ?? DEFAULT_CATEGORY_GRADIENT}
            size={36}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[typography.subheading, { color: colors.textPrimary }]} numberOfLines={1}>
              {record.exerciseName}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {record.totalSets} set{record.totalSets === 1 ? '' : 's'} logged
            </Text>
          </View>
          {freshIds.has(record.exerciseId) ? (
            // On the card rather than on the individual line, because the
            // line already shows its own date -- this is the marker that
            // makes the card worth stopping at while scrolling past twenty.
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: colors.success,
                borderRadius: radius.pill,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
              }}
            >
              <Ionicons name="sparkles" size={10} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>New</Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
        </AnimatedPressable>

        <View style={{ gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
          {lines.map((line) => (
            <RecordLine key={line.label} {...line} />
          ))}
        </View>
      </Card>
    );
  };

  return (
    <ScreenContainer>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <ErrorNotice message={error} onRetry={reload} />
      ) : records.length === 0 ? (
        <EmptyState
          icon="trophy"
          colors={gradients.flame}
          title="No records yet"
          detail="Log a workout and your bests start appearing here automatically. There's nothing to set up."
        />
      ) : (
        <>
          {/* One pill that opens a picker, matching the exercise catalogue.
              A wrapping row of seven pills kept the whole "pick a category"
              choice permanently on screen when only one is ever active, and
              pushed the records themselves below the fold. */}
          {categories.length > 2 ? (
            <CategoryFilterPicker options={categories} value={category} onChange={setCategory} />
          ) : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <StatChip icon="trophy-outline" value={`${visible.length} exercise${visible.length === 1 ? '' : 's'}`} />
            {freshIds.size > 0 ? (
              <StatChip
                icon="sparkles-outline"
                value={`${freshIds.size} new this week`}
              />
            ) : null}
          </View>

          {/* Export sits with the records rather than only in Account: this
              is the screen where someone is looking at their numbers and
              thinking "I want these in a spreadsheet". Same hook as Account,
              so the two can't report different outcomes for the same file. */}
          <Card>
            <PaidFeatureLink
              featureId="data-export"
              label={exporting ? 'Preparing your export…' : 'Export this history as CSV'}
              onOpen={exporting ? () => {} : runExport}
              // Alone in its card, so a leading rule would be a line with
              // nothing above it. Ruled underneath instead, the way a record
              // card rules off its header.
              divider="bottom"
            />
            {exportResult ? (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{exportResult}</Text>
            ) : null}
          </Card>

          {visible.map(renderRecord)}
        </>
      )}
    </ScreenContainer>
  );
}
