import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Card } from './Card';
import { GradientButton } from './GradientButton';
import { PopInView } from './PopInView';
import { mlToOz, ozToMl } from '../lib/water';
import { useTheme } from '../theme/useTheme';

interface WaterGoalModalProps {
  visible: boolean;
  unit: 'oz' | 'ml';
  currentGoalMl: number;
  onSave: (goalMl: number) => Promise<void>;
  onClose: () => void;
}

/**
 * Same "visible whenever a value is non-null/true" idiom as AvatarCropModal
 * and the exercise info modal — reached by tapping the goal line on the
 * water card, rather than only from Account → Units, so changing it doesn't
 * require leaving Home.
 */
export function WaterGoalModal({ visible, unit, currentGoalMl, onSave, onClose }: WaterGoalModalProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const startingValue = unit === 'ml' ? Math.round(currentGoalMl) : Math.round(mlToOz(currentGoalMl));
  const [value, setValue] = useState(String(startingValue));
  const [saving, setSaving] = useState(false);

  const parsed = Number(value);
  const isValid = value.trim().length > 0 && Number.isFinite(parsed) && parsed > 0;

  const onConfirm = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await onSave(Math.round(unit === 'ml' ? parsed : ozToMl(parsed)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg }}
      >
        <Pressable onPress={() => {}}>
          <PopInView style={{ gap: spacing.md }}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Text style={[typography.subheading, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>
                  Daily water goal
                </Text>
                <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </Pressable>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <TextInput
                  value={value}
                  onChangeText={setValue}
                  keyboardType="numeric"
                  autoFocus
                  style={{
                    flex: 1,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    color: colors.textPrimary,
                    fontSize: 18,
                    fontWeight: '700',
                  }}
                />
                <Text style={{ color: colors.textSecondary }}>{unit === 'ml' ? 'ml' : 'fl oz'}</Text>
              </View>

              <GradientButton
                label={saving ? 'Saving...' : 'Save goal'}
                loading={saving}
                disabled={!isValid}
                onPress={onConfirm}
              />
            </Card>
          </PopInView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
