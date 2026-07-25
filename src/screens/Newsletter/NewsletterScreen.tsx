import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { GradientPill } from '../../components/GradientPill';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatChip } from '../../components/StatChip';
import {
  ARTICLE_CATEGORY_FILTERS,
  ARTICLE_CATEGORY_GRADIENTS,
  ARTICLE_CATEGORY_ICONS,
  ARTICLE_CATEGORY_LABELS,
} from '../../constants/articles';
import { useArticles } from '../../hooks/useArticles';
import { useTheme } from '../../theme/useTheme';
import type { Article, ArticleCategory } from '../../types/models';
import type { NewsletterStackParamList } from '../../navigation/stacks/NewsletterStack';

function formatPublished(iso: string) {
  const published = new Date(iso);
  const days = Math.floor((Date.now() - published.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return published.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function NewsletterScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<NewsletterStackParamList>>();
  const { articles, loading, error, reload } = useArticles();
  const [activeCategory, setActiveCategory] = useState<ArticleCategory | 'all'>('all');

  const filtered = useMemo(
    () =>
      activeCategory === 'all'
        ? articles
        : articles.filter((a) => a.category === activeCategory),
    [articles, activeCategory]
  );

  const onOpen = (article: Article) => {
    navigation.navigate('ArticleDetail', { articleId: article.id });
  };

  return (
    <ScreenContainer>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {ARTICLE_CATEGORY_FILTERS.map((c) => (
          <GradientPill
            key={c.value}
            label={c.label}
            active={c.value === activeCategory}
            onPress={() => setActiveCategory(c.value)}
            colors={
              c.value === 'all' ? undefined : ARTICLE_CATEGORY_GRADIENTS[c.value as ArticleCategory]
            }
          />
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <ErrorNotice message={error} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <Card>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            {articles.length === 0
              ? 'No articles published yet. Check back soon.'
              : 'Nothing in this category yet.'}
          </Text>
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {filtered.map((article) => (
            <Pressable
              key={article.id}
              onPress={() => onOpen(article)}
              accessibilityRole="button"
              accessibilityLabel={`Read ${article.title}`}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
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
                    <Text style={[typography.subheading, { color: colors.textPrimary }]}>
                      {article.title}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>

                <Text style={[typography.body, { color: colors.textSecondary }]}>
                  {article.summary}
                </Text>

                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <StatChip icon="time-outline" value={`${article.readMinutes} min read`} />
                  <StatChip icon="calendar-outline" value={formatPublished(article.publishedAt)} />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}
