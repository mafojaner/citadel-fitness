import { Text } from 'react-native';
import { Card } from '../../components/Card';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useTheme } from '../../theme/useTheme';

export function PreferencesScreen() {
  const { colors, typography } = useTheme();
  return (
    <ScreenContainer>
      <Card title="Preferences">
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Units, notifications, and theme preferences coming soon.
        </Text>
      </Card>
    </ScreenContainer>
  );
}
