import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { PASSWORD_REQUIREMENTS } from '../lib/password';
import { useTheme } from '../theme/useTheme';

interface PasswordRequirementsListProps {
  password: string;
}

/** Live checklist of password requirements, shared by every screen that sets a password. */
export function PasswordRequirementsList({ password }: PasswordRequirementsListProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      {PASSWORD_REQUIREMENTS.map((requirement) => {
        const met = requirement.test(password);
        return (
          <View key={requirement.key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons
              name={met ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={met ? colors.success : colors.textMuted}
            />
            <Text style={[typography.caption, { color: met ? colors.textSecondary : colors.textMuted }]}>
              {requirement.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
