import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { Card } from '../../components/Card';
import { FavoriteButton } from '../../components/FavoriteButton';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { ProfileIconButton } from '../../components/ProfileIconButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SearchField } from '../../components/SearchField';
import { StatChip } from '../../components/StatChip';
import {
  ARTICLE_CATEGORY_GRADIENTS,
  ARTICLE_CATEGORY_ICONS,
  ARTICLE_CATEGORY_LABELS,
} from '../../constants/articles';
import {
  CATEGORY_GRADIENTS,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_GRADIENT,
  DEFAULT_CATEGORY_ICON,
} from '../../constants/categories';
import { useArticles } from '../../hooks/useArticles';
import { useExercises } from '../../hooks/useExercises';
import { formatPublished } from '../../lib/articles';
import { todayISO } from '../../lib/analytics';
import { useTheme } from '../../theme/useTheme';
import { useWorkoutDraftStore } from '../../state/workoutDraftStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Article, Exercise } from '../../types/models';
import type { SearchStackParamList } from '../../navigation/stacks/SearchStack';

/**
 * The app's one search surface — reached via the Search tab instead of a
 * cramped header field, so the whole screen is free to be the result list.
 * Searches across everything with a text label worth matching on: the
 * exercise catalogue and newsletter articles, shown as separate sections
 * so it's clear which kind of thing each result is.
 */
export function SearchScreen() {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SearchStackParamList>>();
  const { exercises } = useExercises();
  const { articles } = useArticles();
  const ensureDraftFor = useWorkoutDraftStore((s) => s.ensureDraftFor);
  const addExercise = useWorkoutDraftStore((s) => s.addExercise);
  const [query, setQuery] = useState('');

  const trimmed = query.trim();
  const q = trimmed.toLowerCase();
  const exerciseResults = trimmed ? exercises.filter((e) => e.name.toLowerCase().includes(q)) : [];
  const articleResults = trimmed
    ? articles.filter((a) => a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q))
    : [];
  const hasResults = exerciseResults.length > 0 || articleResults.length > 0;

  const onSelectExercise = (exercise: Exercise) => {
    // Append to today's draft rather than replacing it, so picking a second
    // exercise (or returning to an unsaved workout) doesn't wipe the first.
    ensureDraftFor(todayISO());
    addExercise(exercise);
    navigation.navigate('AddWorkout');
  };

  const onOpenArticle = (article: Article) => {
    navigation.navigate('ArticleDetail', { articleId: article.id });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          backgroundColor: colors.navBackground,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.sm,
          paddingHorizontal: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <View style={{ flex: 1 }}>
          <SearchField
            placeholder="Search exercises, newsletters..."
            value={query}
            onChangeText={setQuery}
            size="large"
            autoFocus
          />
        </View>
        <ProfileIconButton />
      </View>

      <ScreenContainer>
        {!trimmed ? (
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Search for an exercise to add it to today&apos;s workout, or a newsletter article to read.
          </Text>
        ) : !hasResults ? (
          <Card>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              No exercises or newsletter articles match &quot;{trimmed}&quot;.
            </Text>
          </Card>
        ) : (
          <>
            {exerciseResults.length > 0 ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={[typography.subheading, { color: colors.textPrimary }]}>Exercises</Text>
                {exerciseResults.map((exercise) => (
                  <AnimatedPressable key={exercise.id} onPress={() => onSelectExercise(exercise)} scaleTo={0.98}>
                    <Card>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                        <GradientIconBadge
                          icon={CATEGORY_ICONS[exercise.category] ?? DEFAULT_CATEGORY_ICON}
                          colors={CATEGORY_GRADIENTS[exercise.category] ?? DEFAULT_CATEGORY_GRADIENT}
                          size={36}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[typography.subheading, { color: colors.textPrimary }]}>
                            {exercise.name}
                          </Text>
                          <Text
                            style={[typography.caption, { color: colors.textMuted, textTransform: 'capitalize' }]}
                          >
                            {exercise.category}
                          </Text>
                        </View>
                        <Ionicons name="add-circle" size={26} color={colors.primary} />
                      </View>
                    </Card>
                  </AnimatedPressable>
                ))}
              </View>
            ) : null}

            {articleResults.length > 0 ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={[typography.subheading, { color: colors.textPrimary }]}>Newsletter</Text>
                {articleResults.map((article) => (
                  <AnimatedPressable
                    key={article.id}
                    onPress={() => onOpenArticle(article)}
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
                          <Text style={[typography.subheading, { color: colors.textPrimary }]}>
                            {article.title}
                          </Text>
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
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScreenContainer>
    </View>
  );
}
