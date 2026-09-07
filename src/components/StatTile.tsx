import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { IconWell } from './IconWell';

interface StatTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  /** The metric's own ramp. Only the glyph wears it; the tile and its disc stay neutral. */
  gradientColors: readonly [string, string, ...string[]];
  value: string;
  label: string;
}

export function StatTile({ icon, gradientColors, value, label }: StatTileProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View
      style={{
        flexBasis: '47%',
        flexGrow: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.sm,
        // A neutral shadow, where this was tinted with the tile's own
        // gradient. A vivid glow under each of three tiles was three tiles
        // asking to be looked at first, and the tint encoded nothing the
        // number above it did not already say.
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      }}
    >
      <IconWell icon={icon} size={40} colors={gradientColors} />
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.2 }}>
        {value}
      </Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.3 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
