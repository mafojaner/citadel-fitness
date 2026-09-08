import type { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { IconWell } from './IconWell';
import { useTheme } from '../theme/useTheme';

interface CardHeadProps {
  icon: keyof typeof Ionicons.glyphMap;
  /** The subject's ink. The disc fills with it; see IconWell. */
  tint: string;
  title: string;
  /** The line under it, saying what the card measures or offers. */
  detail: string;
}

/**
 * A tinted glyph, a title, and the line explaining what the card is.
 *
 * Written for the analytics screen and shared the moment the programme
 * screen was rebuilt in the same language -- the two are meant to read as
 * the same product, and a second copy is how one of them quietly grows a
 * different gap or a different glyph size.
 */
export function CardHead({ icon, tint, title, detail }: CardHeadProps) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <IconWell icon={icon} size={30} tint={tint} />
        <Text style={[typography.subheading, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>
          {title}
        </Text>
      </View>
      <Text style={[typography.caption, { color: colors.textMuted }]}>{detail}</Text>
    </View>
  );
}
