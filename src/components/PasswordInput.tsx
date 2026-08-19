import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface PasswordInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  editable?: boolean;
  hasError?: boolean;
  backgroundColor?: string;
}

/** A password TextInput with a show/hide toggle, shared by every screen that collects a password. */
export function PasswordInput({
  placeholder,
  value,
  onChangeText,
  editable = true,
  hasError = false,
  backgroundColor,
}: PasswordInputProps) {
  const { colors, spacing, radius } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: backgroundColor ?? colors.surface,
        borderColor: hasError ? colors.danger : colors.border,
        borderWidth: 1,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
      }}
    >
      <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={!visible}
        autoCapitalize="none"
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        style={{ flex: 1, paddingVertical: spacing.md, color: colors.textPrimary }}
      />
      {/* hitSlop 12 around a 20px icon gives a 44px target, the smallest
          iOS and Android both consider reliably tappable. */}
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      >
        <Ionicons name={visible ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}
