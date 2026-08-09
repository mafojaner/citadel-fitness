import { Ionicons } from '@expo/vector-icons';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface AuthTextInputProps
  extends Pick<TextInputProps, 'autoCapitalize' | 'keyboardType' | 'editable' | 'autoComplete'> {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  hasError?: boolean;
}

/** An icon-prefixed text field — the email-entry counterpart to PasswordInput's lock icon. */
export function AuthTextInput({
  icon,
  placeholder,
  value,
  onChangeText,
  hasError = false,
  ...rest
}: AuthTextInputProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderColor: hasError ? colors.danger : colors.border,
        borderWidth: 1,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
      }}
    >
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        style={{ flex: 1, paddingVertical: spacing.md, color: colors.textPrimary }}
        {...rest}
      />
    </View>
  );
}
