import { Ionicons } from '@expo/vector-icons';
import { Image, View } from 'react-native';
import { GradientNumberBadge } from './GradientNumberBadge';
import { gradients } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** Rank 1/2/3 get a gold/silver/bronze ring + corner badge; everyone past that is unranked here. */
const PODIUM_GRADIENTS = [gradients.rankGold, gradients.rankSilver, gradients.rankBronze] as const;

interface RankAvatarProps {
  /** 1-based leaderboard position. */
  rank: number;
  avatarUrl: string | null;
  size?: number;
}

/**
 * A person's avatar with their rank as a gradient badge overlapping the
 * bottom-right corner — replaces a plain medal icon sitting beside the
 * avatar, which read as a generic emoji rather than something tied to the
 * specific person. Only ranks 1-3 get the gold/silver/bronze treatment;
 * everyone else renders as a plain photo (no badge) since a leaderboard's
 * whole point is that the top spots read as special.
 */
export function RankAvatar({ rank, avatarUrl, size = 40 }: RankAvatarProps) {
  const { colors } = useTheme();
  const gradient = PODIUM_GRADIENTS[rank - 1];
  const badgeSize = Math.max(16, Math.round(size * 0.46));

  return (
    <View style={{ width: size, height: size }}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.background,
            borderWidth: gradient ? 2.5 : 0,
            borderColor: gradient ? gradient[1] : 'transparent',
          }}
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.background,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: gradient ? 2.5 : 1,
            borderColor: gradient ? gradient[1] : colors.border,
          }}
        >
          <Ionicons name="person" size={size * 0.52} color={colors.textMuted} />
        </View>
      )}
      {gradient ? (
        <View style={{ position: 'absolute', bottom: -4, right: -4 }}>
          <GradientNumberBadge
            value={rank}
            colors={gradient}
            size={badgeSize}
            fontSize={Math.round(badgeSize * 0.52)}
          />
        </View>
      ) : null}
    </View>
  );
}
