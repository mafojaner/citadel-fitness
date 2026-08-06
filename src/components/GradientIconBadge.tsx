import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientIconBadgeProps {
  icon: keyof typeof Ionicons.glyphMap;
  colors: readonly [string, string, ...string[]];
  size?: number;
}

export function GradientIconBadge({ icon, colors, size = 44 }: GradientIconBadgeProps) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        // Tinted with the badge's own gradient rather than plain black —
        // same fixed-opacity approach GradientButton/GradientPill already
        // use, which is why neither of them needs to branch on scheme: a
        // vivid tinted shadow carries its own contrast on any background.
        shadowColor: colors[0],
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
      }}
    >
      <Ionicons name={icon} size={size * 0.5} color="#FFFFFF" />
    </LinearGradient>
  );
}
