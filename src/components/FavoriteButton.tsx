import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useAuthStore } from '../state/authStore';
import { useFavoriteArticlesStore } from '../state/favoriteArticlesStore';
import { gradients } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

interface FavoriteButtonProps {
  articleId: string;
  size?: number;
}

export function FavoriteButton({ articleId, size = 22 }: FavoriteButtonProps) {
  const { colors } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const isFavorited = useFavoriteArticlesStore((s) => s.ids.has(articleId));
  const toggle = useFavoriteArticlesStore((s) => s.toggle);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      hitSlop={10}
      onPress={() => userId && toggle(userId, articleId)}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <Ionicons
        name={isFavorited ? 'heart' : 'heart-outline'}
        size={size}
        color={isFavorited ? gradients.favorite[1] : colors.textMuted}
      />
    </Pressable>
  );
}
