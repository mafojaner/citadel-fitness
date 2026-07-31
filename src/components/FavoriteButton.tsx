import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Pressable } from 'react-native';
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
  const [scale] = useState(() => new Animated.Value(1));

  // Pops the heart when it becomes favorited, rather than just swapping the icon.
  useEffect(() => {
    if (!isFavorited) return;
    scale.setValue(0.7);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 14 }).start();
  }, [isFavorited, scale]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      hitSlop={10}
      onPress={() => userId && toggle(userId, articleId)}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={isFavorited ? 'heart' : 'heart-outline'}
          size={size}
          color={isFavorited ? gradients.favorite[1] : colors.textMuted}
        />
      </Animated.View>
    </Pressable>
  );
}
