import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Card } from './Card';

interface ComingSoonCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

export function ComingSoonCard({ icon, title, description }: ComingSoonCardProps) {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={22} color={colors.primary} />
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
            <Text style={[typography.subheading, { color: colors.textPrimary }]}>{title}</Text>
            <View
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
                borderRadius: radius.pill,
                backgroundColor: colors.primaryMuted,
              }}
            >
              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
                SOON
              </Text>
            </View>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{description}</Text>
        </View>
      </View>
    </Card>
  );
}
