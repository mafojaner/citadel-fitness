import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { GradientIconBadge } from './GradientIconBadge';
import { PopInView } from './PopInView';
import {
  CATEGORY_GRADIENTS,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_GRADIENT,
  DEFAULT_CATEGORY_ICON,
} from '../constants/categories';
import { useTheme } from '../theme/useTheme';
import type { Category } from '../types/models';

interface FilterOption {
  label: string;
  value: Category | 'all';
}

interface CategoryFilterPickerProps {
  options: readonly FilterOption[];
  value: Category | 'all';
  onChange: (value: Category | 'all') => void;
}

/**
 * One pill that expands into a picker sheet, replacing a horizontal row of
 * 9 category pills — that row meant the same "pick a category" choice was
 * always fully on-screen even though only one is ever active at a time.
 */
export function CategoryFilterPicker({ options, value, onChange }: CategoryFilterPickerProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const [open, setOpen] = useState(false);
  const active = options.find((o) => o.value === value) ?? options[0];

  return (
    <>
      <AnimatedPressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Filter: ${active.label}`}
        scaleTo={0.95}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: spacing.xs,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          borderRadius: radius.pill,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Ionicons name="filter" size={15} color={colors.primary} />
        <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>{active.label}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </AnimatedPressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.lg,
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 320 }}>
            <PopInView>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius.lg,
                  padding: spacing.md,
                  gap: spacing.xs,
                  maxHeight: 420,
                }}
              >
                <Text style={[typography.subheading, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
                  Filter by category
                </Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {options.map((option) => {
                    const isActive = option.value === value;
                    const isAll = option.value === 'all';
                    const gradientColors = isAll
                      ? DEFAULT_CATEGORY_GRADIENT
                      : CATEGORY_GRADIENTS[option.value as Category] ?? DEFAULT_CATEGORY_GRADIENT;
                    const icon = isAll
                      ? 'apps-outline'
                      : CATEGORY_ICONS[option.value as Category] ?? DEFAULT_CATEGORY_ICON;

                    return (
                      <AnimatedPressable
                        key={option.value}
                        onPress={() => {
                          onChange(option.value);
                          setOpen(false);
                        }}
                        scaleTo={0.98}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: spacing.md,
                          paddingVertical: spacing.sm,
                          paddingHorizontal: spacing.xs,
                          borderRadius: radius.md,
                          backgroundColor: isActive ? colors.primaryMuted : 'transparent',
                        }}
                      >
                        <GradientIconBadge icon={icon} colors={gradientColors} size={32} />
                        <Text
                          style={[
                            typography.body,
                            { color: colors.textPrimary, flex: 1, fontWeight: isActive ? '700' : '500' },
                          ]}
                        >
                          {option.label}
                        </Text>
                        {isActive ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                      </AnimatedPressable>
                    );
                  })}
                </ScrollView>
              </View>
            </PopInView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
