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
    <View style={{ justifyContent: 'center' }}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={!visible}
        autoCapitalize="none"
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        style={{
          backgroundColor: backgroundColor ?? colors.surface,
          borderColor: hasError ? colors.danger : colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: spacing.md,
          paddingRight: spacing.md + 28,
          color: colors.textPrimary,
        }}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        style={{ position: 'absolute', right: spacing.md }}
      >
        <Ionicons name={visible ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}
