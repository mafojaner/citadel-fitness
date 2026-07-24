import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Card } from '../../components/Card';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useWorkoutDraftStore } from '../../state/workoutDraftStore';
import { useTheme } from '../../theme/useTheme';
import type { HomeStackParamList } from '../../navigation/stacks/HomeStack';

export function HomeScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const resetDraft = useWorkoutDraftStore((s) => s.reset);

  return (
    <ScreenContainer>
      <TextInput
        placeholder="Search exercises, workouts..."
        placeholderTextColor={colors.textMuted}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: spacing.md,
          color: colors.textPrimary,
        }}
      />

      <Card title="Activity Summary">
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Streak and progress snapshot coming soon.
        </Text>
      </Card>

      <Card title="Workout Summary">
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Recent and upcoming logged workouts will appear here.
        </Text>
      </Card>

      <Pressable
        onPress={() => {
          resetDraft();
          navigation.navigate('AddWorkout');
        }}
        style={({ pressed }) => ({
          backgroundColor: colors.primary,
          borderRadius: radius.md,
          padding: spacing.md,
          alignItems: 'center',
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View>
          <Text style={{ color: colors.surface, fontWeight: '700' }}>Log workout</Text>
        </View>
      </Pressable>
    </ScreenContainer>
  );
}
