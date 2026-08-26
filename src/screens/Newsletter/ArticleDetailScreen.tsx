import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { FavoriteButton } from '../../components/FavoriteButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatChip } from '../../components/StatChip';
import {
  ARTICLE_CATEGORY_GRADIENTS,
  ARTICLE_CATEGORY_ICONS,
  ARTICLE_CATEGORY_LABELS,
} from '../../constants/articles';
import { fetchArticleById } from '../../lib/articles';
import { useAuthStore } from '../../state/authStore';
import { useFavoriteArticlesStore } from '../../state/favoriteArticlesStore';
import { useTheme } from '../../theme/useTheme';
import type { Article } from '../../types/models';
import type { NewsletterStackParamList } from '../../navigation/stacks/NewsletterStack';

/**
 * Renders one paragraph, treating **…** as bold. Deliberately minimal —
 * a full markdown renderer would be a heavy dependency for the small
 * amount of formatting the articles actually use.
 */
function Paragraph({ text }: { text: string }) {
  const { colors, typography } = useTheme();
  const segments = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return (
    <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>
      {segments.map((segment, i) =>
        segment.startsWith('**') && segment.endsWith('**') ? (
          <Text key={i} style={{ color: colors.textPrimary, fontWeight: '700' }}>
            {segment.slice(2, -2)}
          </Text>
        ) : (
          <Text key={i}>{segment}</Text>
        )
      )}
    </Text>
  );
}

export function ArticleDetailScreen() {
  const { colors, spacing, typography } = useTheme();
  const route = useRoute<RouteProp<NewsletterStackParamList, 'ArticleDetail'>>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = useAuthStore((s) => s.session?.user.id);
  const loadFavorites = useFavoriteArticlesStore((s) => s.load);

  useEffect(() => {
    if (userId) loadFavorites(userId);
  }, [userId, loadFavorites]);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchArticleById(route.params.articleId)
      .then((result) => {
        if (!cancelled) setArticle(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setArticle(null);
          setError(err instanceof Error ? err.message : 'Failed to load this article');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [route.params.articleId]);

  useFocusEffect(load);

  if (loading) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <ErrorNotice message={error} onRetry={load} />
      </ScreenContainer>
    );
  }

  if (!article) {
    return (
      <ScreenContainer>
        <Card>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            This article is no longer available.
          </Text>
        </Card>
      </ScreenContainer>
    );
  }

  const paragraphs = article.body.split('\n\n').filter((p) => p.trim().length > 0);

  return (
    <ScreenContainer>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        {/* Matches the list this was opened from: a plain icon, with the
            category's colour reduced to the dot beside its name. A gradient
            disc here would be the loudest thing above an article, which is
            the one screen that is entirely about the words. */}
        <Ionicons
          name={ARTICLE_CATEGORY_ICONS[article.category]}
          size={26}
          color={colors.textSecondary}
          style={{ width: 28, textAlign: 'center' }}
        />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  ARTICLE_CATEGORY_GRADIENTS[article.category][
                    ARTICLE_CATEGORY_GRADIENTS[article.category].length - 1
                  ],
              }}
            />
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {ARTICLE_CATEGORY_LABELS[article.category]}
            </Text>
          </View>
          <Text style={[typography.heading, { color: colors.textPrimary }]}>{article.title}</Text>
        </View>
        <FavoriteButton articleId={article.id} size={26} />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <StatChip icon="time-outline" value={`${article.readMinutes} min read`} />
        <StatChip
          icon="calendar-outline"
          value={new Date(article.publishedAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        />
      </View>

      <Card>
        <View style={{ gap: spacing.md }}>
          {paragraphs.map((paragraph, i) => (
            <Paragraph key={i} text={paragraph} />
          ))}
        </View>
      </Card>
    </ScreenContainer>
  );
}
