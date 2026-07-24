import { Text } from 'react-native';
import { Card } from '../../components/Card';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useTheme } from '../../theme/useTheme';

export function ProfileSettingsScreen() {
  const { colors, typography } = useTheme();
  return (
    <ScreenContainer>
      <Card title="Profile settings">
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Name and avatar editing coming soon.
        </Text>
      </Card>
    </ScreenContainer>
  );
}
