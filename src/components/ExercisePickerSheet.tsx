import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from './AnimatedPressable';
import { IconWell } from './IconWell';
import { CATEGORY_ICONS, CATEGORY_INK, DEFAULT_CATEGORY_ICON, DEFAULT_CATEGORY_INK } from '../constants/categories';
import { useTheme } from '../theme/useTheme';
import type { Exercise } from '../types/models';

interface ExercisePickerSheetProps {
  visible: boolean;
  /** Heading, naming what picking one will do. */
  title: string;
  searchPlaceholder: string;
  /** The slice of the catalogue this sheet offers. Filtered by the field below. */
  options: Exercise[];
  /** Already taken, so the sheet can say so rather than offering it twice. */
  chosenIds: string[];
  /** How a taken row explains itself, e.g. "already in this session". */
  chosenLabel?: string;
  /**
   * A second line under a name, for what the app already knows about it --
   * the goal form uses it to say what each lift's estimated max is, so the
   * consequence of picking an unlogged one is visible before the pick.
   */
  detailFor?: (exercise: Exercise) => string | null;
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
}

/**
 * A slice of the exercise catalogue, searchable, in a bottom sheet.
 *
 * Written for conditioning, where four fixed finisher pills covered the
 * common cases and none of the real ones -- a member who swims, hikes,
 * boxes or does stair sprints had a screen telling them their options were
 * rowing or a treadmill. The goal form had the same shape of problem from
 * the other direction: a wrapping row of pills, one per lift, which is fine
 * at eight and unusable at eighty, and which could only ever offer lifts
 * already logged.
 *
 * A search field rather than categories, because the list is a hundred-odd
 * entries and anyone opening this already knows the name of what they want.
 */
export function ExercisePickerSheet({
  visible,
  title,
  searchPlaceholder,
  options,
  chosenIds,
  chosenLabel = 'already in this session',
  detailFor,
  onPick,
  onClose,
}: ExercisePickerSheetProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const term = query.trim().toLowerCase();
  const shown = term ? options.filter((e) => e.name.toLowerCase().includes(term)) : options;

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(11,14,20,0.45)' }}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />

        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            borderTopWidth: 1,
            borderColor: colors.border,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.md,
            paddingHorizontal: spacing.md,
            gap: spacing.md,
            maxHeight: '78%',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={[typography.subheading, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.pill,
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, minWidth: 0, color: colors.textPrimary, paddingVertical: 2 }}
              accessibilityLabel={searchPlaceholder}
            />
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }}>
            <View style={{ gap: spacing.xs }}>
              {shown.map((exercise) => {
                const already = chosenIds.includes(exercise.id);
                const detail = detailFor?.(exercise) ?? null;
                return (
                  <AnimatedPressable
                    key={exercise.id}
                    scaleTo={0.98}
                    onPress={() => {
                      if (already) return;
                      onPick(exercise);
                      onClose();
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: already }}
                    accessibilityLabel={
                      already
                        ? `${exercise.name}, ${chosenLabel}`
                        : detail
                          ? `${exercise.name}. ${detail}`
                          : `Add ${exercise.name}`
                    }
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      paddingVertical: spacing.sm,
                      opacity: already ? 0.45 : 1,
                    }}
                  >
                    <IconWell
                      icon={CATEGORY_ICONS[exercise.category] ?? DEFAULT_CATEGORY_ICON}
                      size={32}
                      tint={CATEGORY_INK[exercise.category] ?? DEFAULT_CATEGORY_INK}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[typography.body, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {exercise.name}
                      </Text>
                      {detail ? (
                        <Text
                          style={[typography.caption, { color: colors.textMuted }]}
                          numberOfLines={1}
                        >
                          {detail}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons
                      name={already ? 'checkmark' : 'add'}
                      size={18}
                      color={colors.textMuted}
                    />
                  </AnimatedPressable>
                );
              })}

              {shown.length === 0 ? (
                <Text style={[typography.body, { color: colors.textSecondary, paddingVertical: spacing.md }]}>
                  Nothing matches “{query}”.
                </Text>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
