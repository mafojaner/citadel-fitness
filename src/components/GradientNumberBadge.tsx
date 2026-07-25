import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native';

interface GradientNumberBadgeProps {
  value: string | number;
  colors: readonly [string, string, ...string[]];
  size?: number;
  fontSize?: number;
}

export function GradientNumberBadge({ value, colors, size = 32, fontSize = 14 }: GradientNumberBadgeProps) {
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
      }}
    >
      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize }}>{value}</Text>
    </LinearGradient>
  );
}
