import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Card } from '../../components/Card';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useTheme } from '../../theme/useTheme';
import type { Category } from '../../types/models';

const CATEGORIES: { label: string; value: Category | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Chest', value: 'chest' },
  { label: 'Back', value: 'back' },
  { label: 'Legs', value: 'legs' },
  { label: 'Cardio', value: 'cardio' },
];

const placeholderData = [
  { value: 0 },
  { value: 0 },
  { value: 0 },
  { value: 0 },
  { value: 0 },
];

export function ActivityScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');

  return (
    <ScreenContainer>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {CATEGORIES.map((c) => {
          const active = c.value === activeCategory;
          return (
            <Pressable
              key={c.value}
              onPress={() => setActiveCategory(c.value)}
              style={{
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.md,
                borderRadius: radius.pill,
                backgroundColor: active ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
              }}
            >
              <Text style={{ color: active ? colors.surface : colors.textSecondary }}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card title="Progress">
        <LineChart
          data={placeholderData}
          color={colors.primary}
          thickness={2}
          hideDataPoints
          yAxisColor={colors.border}
          xAxisColor={colors.border}
          yAxisTextStyle={{ color: colors.textMuted }}
          noOfSections={3}
          height={160}
        />
      </Card>

      <Card title="Analytics Summary">
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Frequency, streaks, and progression stats will appear here.
        </Text>
      </Card>
    </ScreenContainer>
  );
}
