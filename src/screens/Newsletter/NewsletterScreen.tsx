import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { FavoriteButton } from '../../components/FavoriteButton';
import { FortressFeatureCard } from '../../components/FortressFeatureCard';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatChip } from '../../components/StatChip';
import {
  ARTICLE_CATEGORY_GRADIENTS,
  ARTICLE_CATEGORY_ICONS,
  ARTICLE_CATEGORY_LABELS,
} from '../../constants/articles';
import { useArticles } from '../../hooks/useArticles';
import { useIsDesktop } from '../../hooks/useResponsiveLayout';
import { formatPublished } from '../../lib/articles';
import { useAuthStore } from '../../state/authStore';
import { useFavoriteArticlesStore } from '../../state/favoriteArticlesStore';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { Article, ArticleCategory } from '../../types/models';
import type { NewsletterStackParamList } from '../../navigation/stacks/NewsletterStack';

type FilterValue = ArticleCategory | 'favorites';

const CATEGORY_ORDER: ArticleCategory[] = ['splits', 'exercise', 'nutrition', 'recovery', 'updates'];

export function NewsletterScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  // Three across on desktop: at two, each tile is over 500px wide and barely
  // 90 tall, which reads as a stack of bars rather than a grid of cards.
  // Basis + grow rather than a plain width, for the reason in CategoryGridCard.
  const categoryTile = { flexBasis: useIsDesktop() ? '30%' : '47%', flexGrow: 1, minWidth: 0 } as const;
  const navigation = useNavigation<NativeStackNavigationProp<NewsletterStackParamList>>();
  const { articles, loading, error, reload } = useArticles();
  const [activeFilter, setActiveFilter] = useState<FilterValue | null>(null);

  const userId = useAuthStore((s) => s.session?.user.id);
  const favoriteIds = useFavoriteArticlesStore((s) => s.ids);
  const loadFavorites = useFavoriteArticlesStore((s) => s.load);

  useEffect(() => {
    if (userId) loadFavorites(userId);
  }, [userId, loadFavorites]);

  const categoryCounts = useMemo(() => {
    const map = new Map<ArticleCategory, number>();
    for (const a of articles) map.set(a.category, (map.get(a.category) ?? 0) + 1);
    return map;
  }, [articles]);

  const favoritesCount = useMemo(
    () => articles.filter((a) => favoriteIds.has(a.id)).length,
    [articles, favoriteIds]
  );

  const filtered = useMemo(() => {
    if (!activeFilter) return [];
    if (activeFilter === 'favorites') return articles.filter((a) => favoriteIds.has(a.id));
    return articles.filter((a) => a.category === activeFilter);
  }, [articles, activeFilter, favoriteIds]);

  const activeLabel =
    activeFilter === 'favorites'
      ? 'Favorites'
      : activeFilter
        ? ARTICLE_CATEGORY_LABELS[activeFilter]
        : '';

  const onOpen = (article: Article) => {
    navigation.navigate('ArticleDetail', { articleId: article.id });
  };

  const renderArticleRow = (article: Article) => (
    <AnimatedPressable
      key={article.id}
      onPress={() => onOpen(article)}
      accessibilityRole="link"
      accessibilityLabel={`Read ${article.title}`}
      scaleTo={0.98}
    >
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <GradientIconBadge
            icon={ARTICLE_CATEGORY_ICONS[article.category]}
            colors={ARTICLE_CATEGORY_GRADIENTS[article.category]}
            size={40}
          />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {ARTICLE_CATEGORY_LABELS[article.category]}
            </Text>
            <Text style={[typography.subheading, { color: colors.textPrimary }]}>{article.title}</Text>
          </View>
          <FavoriteButton articleId={article.id} />
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>

        <Text style={[typography.body, { color: colors.textSecondary }]}>{article.summary}</Text>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatChip icon="time-outline" value={`${article.readMinutes} min read`} />
          <StatChip icon="calendar-outline" value={formatPublished(article.publishedAt)} />
        </View>
      </Card>
    </AnimatedPressable>
  );

  return (
    <ScreenContainer>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <ErrorNotice message={error} onRetry={reload} />
      ) : activeFilter === null ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {CATEGORY_ORDER.map((cat) => {
            const count = categoryCounts.get(cat) ?? 0;
            return (
              <AnimatedPressable key={cat} onPress={() => setActiveFilter(cat)} scaleTo={0.96} style={categoryTile}>
                <LinearGradient
                  colors={ARTICLE_CATEGORY_GRADIENTS[cat]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: radius.lg,
                    padding: spacing.md,
                    minHeight: 120,
                    justifyContent: 'space-between',
                  }}
                >
                  <Ionicons name={ARTICLE_CATEGORY_ICONS[cat]} size={26} color="#FFFFFF" />
                  <View style={{ gap: 2 }}>
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
                      {ARTICLE_CATEGORY_LABELS[cat]}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>
                      {count} article{count === 1 ? '' : 's'}
                    </Text>
                  </View>
                </LinearGradient>
              </AnimatedPressable>
            );
          })}

          <AnimatedPressable onPress={() => setActiveFilter('favorites')} scaleTo={0.96} style={categoryTile}>
            <LinearGradient
              colors={gradients.favorite}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: radius.lg,
                padding: spacing.md,
                minHeight: 120,
                justifyContent: 'space-between',
              }}
            >
              <Ionicons name="heart" size={26} color="#FFFFFF" />
              <View style={{ gap: 2 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>Favorites</Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>
                  {favoritesCount} article{favoritesCount === 1 ? '' : 's'}
                </Text>
              </View>
            </LinearGradient>
          </AnimatedPressable>
        </View>
      ) : null}

      {/* Below the category grid, and only on it: the guide library is more
          of the same reading material, so it belongs beside the categories
          rather than inside a filtered list of articles. */}
      {activeFilter === null ? <FortressFeatureCard featureId="expert-guides" /> : null}

      {activeFilter !== null ? (
        <>
          <AnimatedPressable
            onPress={() => setActiveFilter(null)}
            scaleTo={0.92}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '600' }}>All categories</Text>
          </AnimatedPressable>

          <Text style={[typography.heading, { color: colors.textPrimary }]}>{activeLabel}</Text>

          {filtered.length === 0 ? (
            <Card>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                {activeFilter === 'favorites'
                  ? "You haven't favorited any articles yet. Tap the heart on one to save it here."
                  : 'Nothing in this category yet.'}
              </Text>
            </Card>
          ) : (
            <View style={{ gap: spacing.md }}>{filtered.map(renderArticleRow)}</View>
          )}
        </>
      ) : null}
    </ScreenContainer>
  );
}
