import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { CardHead } from '../../components/CardHead';
import { Disclosure } from '../../components/Disclosure';
import { ErrorNotice } from '../../components/ErrorNotice';
import { IconWell } from '../../components/IconWell';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { CategoryFilterPicker } from '../../components/CategoryFilterPicker';
import { EmptyState } from '../../components/EmptyState';
import { GradientPill } from '../../components/GradientPill';
import { PaidFeatureLink } from '../../components/PaidFeatureCard';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SearchField } from '../../components/SearchField';
import { TierMark } from '../../components/TierMark';
import { Section } from '../../components/analytics/Section';
import { StatBlock } from '../../components/analytics/StatBlock';
import { StatGrid } from '../../components/analytics/StatGrid';
import {
  CATEGORY_INK,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_INK,
  DEFAULT_CATEGORY_ICON,
} from '../../constants/categories';
import { useDataExport } from '../../hooks/useDataExport';
import { EXPORT_RANGES, type ExportRange } from '../../lib/dataExport';
import { usePersonalRecords } from '../../hooks/usePersonalRecords';
import { todayISO } from '../../lib/analytics';
import { formatDuration } from '../../lib/units';
import {
  isRecentRecord,
  recentRecords,
  sortRecords,
  summariseRecords,
  type PersonalRecord,
  type RecordKind,
  type RecordSortMode,
} from '../../lib/personalRecords';
import { useProfileStore } from '../../state/profileStore';
import type { Category, DistanceUnit, WeightUnit } from '../../types/models';
import { useTheme } from '../../theme/useTheme';
import { iconInk } from '../../theme/tokens';
import type { ActivityStackParamList } from '../../navigation/stacks/ActivityStack';

function formatDate(dateString: string | null) {
  if (!dateString) return null;
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const SORTS: { label: string; value: RecordSortMode }[] = [
  { label: 'Recent', value: 'recent' },
  { label: 'Heaviest', value: 'heaviest' },
  { label: 'A–Z', value: 'name' },
];

interface RecordLine {
  kind: RecordKind;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  date: string | null;
}

/**
 * One exercise's records, in the order they are worth reading.
 *
 * The first is the headline -- what the card prints large and what the
 * "set this week" list falls back to. For a lift that is the heaviest set,
 * which is the number people actually quote; for cardio it is the longest
 * effort.
 *
 * Built in one place because two sections read it. The card renders the
 * whole list and the recent strip looks up a single kind, and when these
 * were two separate literals the same record could have been labelled
 * "Best day volume" in one and "Best day" in the other.
 *
 * Every line is conditional on having a value above zero, which is the same
 * rule `datedRecords` applies in personalRecords.ts -- a bodyweight lift
 * comes back from the server with a dated 0 kg heaviest set and a dated 0 kg
 * best day, and printing them was how "0 kg × 0" ended up as a headline.
 * Returns nothing at all for such a lift, and the card says so in words.
 */
function linesFor(
  record: PersonalRecord,
  weightUnit: WeightUnit,
  distanceUnit: DistanceUnit
): RecordLine[] {
  if (record.type === 'cardio') {
    return [
      ...(record.longestDurationSeconds > 0
        ? [
            {
              kind: 'longestDuration' as const,
              icon: 'time-outline' as const,
              label: 'Longest session',
              value: formatDuration(record.longestDurationSeconds),
              date: record.longestDurationDate,
            },
          ]
        : []),
      ...(record.farthestDistance > 0
        ? [
            {
              kind: 'farthestDistance' as const,
              icon: 'navigate-outline' as const,
              label: 'Farthest distance',
              value: `${record.farthestDistance} ${distanceUnit}`,
              date: record.farthestDistanceDate,
            },
          ]
        : []),
      // Only when the best day was more than the single longest effort.
      // Someone who has done one 60-minute row had both records printed,
      // reading as two achievements where there was one session.
      ...(record.bestSessionValue > 0 && record.bestSessionValue * 60 > record.longestDurationSeconds
        ? [
            {
              kind: 'bestSession' as const,
              icon: 'flame-outline' as const,
              label: 'Best day',
              value: `${record.bestSessionValue} min`,
              date: record.bestSessionDate,
            },
          ]
        : []),
    ];
  }

  return [
    ...(record.heaviestWeight > 0
      ? [
          {
            kind: 'heaviestWeight' as const,
            icon: 'barbell-outline' as const,
            label: 'Heaviest set',
            value: `${record.heaviestWeight} ${weightUnit} × ${record.heaviestWeightReps}`,
            date: record.heaviestWeightDate,
          },
        ]
      : []),
    // Hidden rather than shown as zero when every set was too high-rep to
    // estimate from — an absent record reads better than a false one.
    ...(record.estimatedOneRepMax > 0
      ? [
          {
            kind: 'estimatedOneRepMax' as const,
            icon: 'trending-up-outline' as const,
            label: 'Best est. 1RM',
            value: `${record.estimatedOneRepMax} ${weightUnit}`,
            date: record.estimatedOneRepMaxDate,
          },
        ]
      : []),
    ...(record.bestSessionValue > 0
      ? [
          {
            kind: 'bestSession' as const,
            icon: 'flame-outline' as const,
            label: 'Best day volume',
            value: `${record.bestSessionValue} ${weightUnit}`,
            date: record.bestSessionDate,
          },
        ]
      : []),
  ];
}

/**
 * The marker on a card whose record was broken inside the window.
 *
 * `ctaFill` rather than the success green it used to be. The green is one
 * fixed value in both themes and it was carrying white text at about 2.6:1,
 * which is under the floor for any text at any size -- and the app's own
 * emphasis pair is the mirrored one the primary button and the training
 * week already use, near-black on light and near-white on dark, contrasting
 * properly in both. The sparkle is what says this is good news; the colour
 * was never doing that job legibly.
 */
function NewMark() {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.ctaFill,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
      }}
    >
      <Ionicons name="sparkles" size={10} color={colors.ctaText} />
      <Text style={{ color: colors.ctaText, fontSize: 10, fontWeight: '700' }}>New</Text>
    </View>
  );
}

/**
 * Every record is derived from logged sets rather than stored, so nothing
 * needs backfilling and a corrected workout corrects its records too. See
 * personalRecords.ts for the arithmetic.
 *
 * Laid out in the same language as the analytics screen -- counted headline
 * figures, a card head per section, staggered arrival -- because the two are
 * the pair of screens a Fortress membership is bought for and they read as
 * one product now. This was ten identical cards of three grey lines under a
 * card offering a CSV download, which answered "what is my bench best" and
 * nothing else.
 */
export function PersonalRecordsScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ActivityStackParamList>>();
  const weightUnit = useProfileStore((s) => s.preferences.units);
  const distanceUnit = useProfileStore((s) => s.preferences.distanceUnit);
  const { records, loading, error, reload } = usePersonalRecords();
  const { exporting, result: exportResult, run: runExport } = useDataExport();
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<RecordSortMode>('recent');
  const [exportRange, setExportRange] = useState<ExportRange>('all');

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

  // Computed once here rather than per card, since `today` should not be
  // re-derived halfway down a list that might straddle midnight.
  const today = todayISO();
  const summary = useMemo(() => summariseRecords(records, today), [records, today]);
  const fresh = useMemo(() => recentRecords(records, today), [records, today]);

  // Filtered by name as well as category.
  //
  // The vault is a flat list. At thirty or forty exercises -- ordinary after
  // a year of training -- finding one lift is scrolling, and the category
  // picker only narrows it to a dozen.
  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      sortRecords(
        records.filter(
          (r) =>
            (category === 'all' || r.category === category) &&
            (needle.length === 0 || r.exerciseName.toLowerCase().includes(needle))
        ),
        sort
      ),
    [records, category, needle, sort]
  );
  const filtered = visible.length !== records.length;

  const renderRecord = (record: PersonalRecord) => {
    const lines = linesFor(record, weightUnit, distanceUnit);
    const [headline, ...rest] = lines;
    const ink = CATEGORY_INK[record.category] ?? DEFAULT_CATEGORY_INK;

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
          accessibilityLabel={
            headline
              ? `${record.exerciseName}, ${headline.label} ${headline.value}. Opens this lift's record, goal and progression.`
              : `${record.exerciseName}, no measured record yet. Opens this lift's record, goal and progression.`
          }
        >
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <IconWell
                icon={CATEGORY_ICONS[record.category] ?? DEFAULT_CATEGORY_ICON}
                size={36}
                tint={ink}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[typography.subheading, { color: colors.textPrimary }]} numberOfLines={1}>
                  {record.exerciseName}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {record.totalSets} set{record.totalSets === 1 ? '' : 's'} logged
                </Text>
              </View>
              {isRecentRecord(record, today) ? <NewMark /> : null}
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>

            {/* The best number, at the size it deserves.
                *
                * All three records were printed as equal caption-grey rows,
                * which made a card of bests read as a table of readings --
                * nothing on it was the record, and a hundred-kilo squat
                * looked exactly like a thirteen-kilo cable crossover.
                * One of the three is what somebody would say out loud if
                * asked about this lift; that is the one that is large. */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                gap: spacing.sm,
                paddingTop: spacing.sm,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              {headline ? (
                <>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: 26,
                      fontWeight: '800',
                      letterSpacing: -0.4,
                    }}
                  >
                    {headline.value}
                  </Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[typography.caption, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {headline.label}
                    </Text>
                    {headline.date ? (
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                        {formatDate(headline.date)}
                      </Text>
                    ) : null}
                  </View>
                </>
              ) : (
                /* Bodyweight-only, so every figure the server has for this
                   lift is a zero. Said plainly, where the screen used to
                   print "0 kg × 0" in the headline slot. */
                <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
                  Logged without a weight, so there is no measured best yet. Add one while
                  logging and it appears here.
                </Text>
              )}
            </View>
          </View>
        </AnimatedPressable>

        {rest.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            {rest.map((line) => (
              <View
                key={line.kind}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
              >
                <Ionicons name={line.icon} size={15} color={colors.textMuted} />
                <Text
                  style={[typography.caption, { color: colors.textSecondary, flex: 1, minWidth: 0 }]}
                >
                  {line.label}
                </Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}>
                    {line.value}
                  </Text>
                  {line.date ? (
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                      {formatDate(line.date)}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </Card>
    );
  };

  let section = 0;

  return (
    <ScreenContainer>
      <TierMark />
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <ErrorNotice message={error} onRetry={reload} />
      ) : records.length === 0 ? (
        <EmptyState
          tint={iconInk.amber}
          icon="trophy"
          title="No records yet"
          detail="Log a workout and your bests start appearing here automatically. There's nothing to set up."
        />
      ) : (
        <>
          {/* What is in the vault, before any of it is listed. Someone who
              opens this and leaves within a second should still have
              learned something. */}
          <Section index={section++}>
            <Card>
              <StatGrid>
                <StatBlock label="Records" value={summary.exercises} detail="exercises" />
                <StatBlock label="New" value={summary.newThisWeek} detail="in 7 days" />
                {/* Weight for anyone who lifts, minutes for anyone who does
                    not. A member who only runs had a 0 kg headline, which
                    is a claim about them rather than a fact about their
                    training. */}
                {summary.heaviestWeight > 0 ? (
                  <StatBlock label="Heaviest" value={summary.heaviestWeight} unit={weightUnit} detail="single set" />
                ) : (
                  <StatBlock
                    label="Longest"
                    value={Math.round(summary.longestDurationSeconds / 60)}
                    unit="min"
                    detail="single effort"
                  />
                )}
                <StatBlock label="Sets" value={summary.totalSets} detail="logged" />
              </StatGrid>
            </Card>
          </Section>

          {/* The one question a records screen exists to answer, answered in
              one place.
              *
              * This was a green badge on whichever cards qualified, in a
              * list ordered by when each lift was last *trained* -- a
              * different question, so the badges did not even cluster at the
              * top. Three of them among ten cards is findable; three among
              * sixty is not. */}
          {fresh.length > 0 ? (
            <Section index={section++}>
              <Card>
                <CardHead
                  icon="sparkles"
                  tint={iconInk.gold}
                  title={`${fresh.length} new record${fresh.length === 1 ? '' : 's'}`}
                  detail="Broken in the last seven days, newest first."
                />
                {fresh.map(({ record, kind, date }) => {
                  const lines = linesFor(record, weightUnit, distanceUnit);
                  // Falls back to the headline when the broken record is one
                  // this card does not print -- a best day equal to the one
                  // long cardio effort, which linesFor deliberately folds away.
                  const line = lines.find((l) => l.kind === kind) ?? lines[0];
                  return (
                    <AnimatedPressable
                      key={record.exerciseId}
                      onPress={() =>
                        navigation.navigate('LiftDetail', {
                          exerciseId: record.exerciseId,
                          exerciseName: record.exerciseName,
                        })
                      }
                      scaleTo={0.99}
                      accessibilityRole="button"
                      accessibilityLabel={`${record.exerciseName}, new ${line.label.toLowerCase()}: ${line.value} on ${formatDate(date)}. Opens this lift.`}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <IconWell
                          icon={CATEGORY_ICONS[record.category] ?? DEFAULT_CATEGORY_ICON}
                          size={30}
                          tint={CATEGORY_INK[record.category] ?? DEFAULT_CATEGORY_INK}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[typography.body, { color: colors.textPrimary }]} numberOfLines={1}>
                            {record.exerciseName}
                          </Text>
                          {/* Which record, not just that there was one.
                              "New" alone leaves you opening the lift to
                              find out what you beat. */}
                          <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
                            {line.label} · {formatDate(date)}
                          </Text>
                        </View>
                        <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 15 }}>
                          {line.value}
                        </Text>
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </Card>
            </Section>
          ) : null}

          {/* The controls for the list, together, immediately above it --
              rather than a filter pill, a search field and a count strewn
              down the page between the header and the first record. */}
          <Section index={section++}>
            <View style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {SORTS.map((option) => (
                  <GradientPill
                    key={option.value}
                    label={option.label}
                    active={sort === option.value}
                    onPress={() => setSort(option.value)}
                    flex
                  />
                ))}
              </View>

              {/* One pill that opens a picker, matching the exercise
                  catalogue. A wrapping row of seven pills kept the whole
                  "pick a category" choice permanently on screen when only
                  one is ever active. */}
              {categories.length > 2 ? (
                <CategoryFilterPicker options={categories} value={category} onChange={setCategory} />
              ) : null}

              {/* Only once there is enough to search. Below a handful of
                  lifts the field is a control that costs a row and saves
                  nothing. */}
              {records.length > 6 ? (
                <SearchField value={query} onChangeText={setQuery} placeholder="Search your lifts" />
              ) : null}

              {/* Said only while it is true. A permanent count of a list you
                  can see is a row that earns nothing; a count of a list you
                  have narrowed tells you how much you are not looking at. */}
              {filtered ? (
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {visible.length === 0
                    ? `No records match. ${records.length} in the vault.`
                    : `${visible.length} of ${records.length} records`}
                </Text>
              ) : null}
            </View>
          </Section>

          {visible.map((record, i) => (
            <Section key={record.exerciseId} index={section + i}>
              {renderRecord(record)}
            </Section>
          ))}

          {/* Export sits with the records rather than only in Account: this
              is the screen where someone is looking at their numbers and
              thinking "I want these in a spreadsheet". Same hook as Account,
              so the two can't report different outcomes for the same file.
              *
              * Behind a disclosure at the foot, where it was the first card
              * on the page -- a tool for leaving with the data, above all
              * the data. Same treatment the programme page gives its tools,
              * for the same reason. */}
          <Disclosure
            label="Export your history"
            hint="Every set, rep and weight as a CSV"
            icon="download-outline"
            tint={iconInk.mint}
          >
            {/* A range, so exporting four years to look at last month stops
                being the only option. Above the link rather than below,
                because it qualifies what the link will do. */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {EXPORT_RANGES.map((r) => (
                <GradientPill
                  key={r.value}
                  label={r.label}
                  active={exportRange === r.value}
                  onPress={() => setExportRange(r.value)}
                />
              ))}
            </View>
            <PaidFeatureLink
              featureId="data-export"
              label={exporting ? 'Preparing your export…' : 'Export this history as CSV'}
              onOpen={exporting ? () => {} : () => runExport(exportRange)}
              // No rule: the disclosure already draws one between its header
              // and this panel, and a second directly under the pills would
              // be two lines within a few points of each other.
              divider="none"
            />
            {exportResult ? (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{exportResult}</Text>
            ) : null}
          </Disclosure>
        </>
      )}
    </ScreenContainer>
  );
}
