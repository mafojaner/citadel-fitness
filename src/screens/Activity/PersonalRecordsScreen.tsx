import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { GradientPill } from '../../components/GradientPill';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatChip } from '../../components/StatChip';
import {
  CATEGORY_GRADIENTS,
  DEFAULT_CATEGORY_GRADIENT,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_ICON,
} from '../../constants/categories';
import { usePersonalRecords } from '../../hooks/usePersonalRecords';
import { formatDuration } from '../../lib/units';
import type { PersonalRecord } from '../../lib/personalRecords';
import { useProfileStore } from '../../state/profileStore';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

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
  const { colors, spacing, typography } = useTheme();
  const weightUnit = useProfileStore((s) => s.preferences.units);
  const distanceUnit = useProfileStore((s) => s.preferences.distanceUnit);
  const { records, loading, error, reload } = usePersonalRecords();
  const [category, setCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const present = Array.from(new Set(records.map((r) => r.category))).sort();
    return ['all', ...present];
  }, [records]);

  const visible = category === 'all' ? records : records.filter((r) => r.category === category);

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
        </View>

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
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <GradientIconBadge icon="trophy" colors={gradients.flame} size={44} />
            <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
              <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
                No records yet
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Log a workout and your bests start appearing here automatically — there&apos;s nothing to set up.
              </Text>
            </View>
          </View>
        </Card>
      ) : (
        <>
          {categories.length > 2 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {categories.map((c) => (
                <GradientPill
                  key={c}
                  label={c === 'all' ? 'All' : c[0].toUpperCase() + c.slice(1)}
                  active={c === category}
                  onPress={() => setCategory(c)}
                />
              ))}
            </View>
          ) : null}

          <StatChip icon="trophy-outline" value={`${visible.length} exercise${visible.length === 1 ? '' : 's'}`} />

          {visible.map(renderRecord)}
        </>
      )}
    </ScreenContainer>
  );
}
