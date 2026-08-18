import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { ErrorNotice } from '../../components/ErrorNotice';
import { FadeInView } from '../../components/FadeInView';
import { GradientButton } from '../../components/GradientButton';
import { trackEvent } from '../../lib/telemetry';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import { motion } from '../../theme/motion';
import { gradients, layout } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

type SlideIcon =
  | { family: 'ionicon'; name: keyof typeof Ionicons.glyphMap }
  | { family: 'material-community'; name: keyof typeof MaterialCommunityIcons.glyphMap };

interface Slide {
  icon: SlideIcon;
  colors: readonly [string, string, ...string[]];
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    icon: { family: 'ionicon', name: 'barbell' },
    colors: gradients.identity,
    title: 'Welcome to Citadel Fitness',
    description: 'Log every set, rep, and rest day in seconds, and build a training history you can actually see.',
  },
  {
    icon: { family: 'ionicon', name: 'book' },
    colors: gradients.volume,
    title: 'A complete exercise catalogue',
    description: 'Dozens of exercises across every muscle group, each with a tap-to-open guide when you need it.',
  },
  {
    icon: { family: 'ionicon', name: 'trending-up' },
    colors: gradients.pulse,
    title: 'See your progress',
    description: 'Streaks, volume, and activity trends update automatically every time you log a workout.',
  },
  {
    icon: { family: 'material-community', name: 'chess-rook' },
    colors: gradients.favorite,
    title: 'Fortress is coming',
    description: 'A premium membership with AI coaching and advanced analytics is on the way. Join the waitlist to be first in line.',
  },
];

export function OnboardingScreen() {
  const { colors, spacing, typography } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const savePreferences = useProfileStore((s) => s.savePreferences);
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const finish = async () => {
    if (!userId) return;
    setFinishing(true);
    setError(null);
    try {
      await savePreferences(userId, { hasSeenOnboarding: true });
      // After the save, not before: a failure here leaves onboarding
      // unfinished, and reporting it as completed would overstate the
      // funnel exactly where it matters most.
      trackEvent({ name: 'onboarding_completed' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
      setFinishing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ alignItems: 'flex-end', padding: spacing.lg }}>
        <AnimatedPressable onPress={finish} disabled={finishing} scaleTo={0.92}>
          <Text style={[typography.body, { color: colors.textMuted }]}>Skip</Text>
        </AnimatedPressable>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
        <FadeInView
          key={index}
          duration={motion.duration.base}
          slideDistance={16}
          style={{ alignItems: 'center', gap: spacing.lg, width: '100%', maxWidth: layout.formMaxWidth }}
        >
          <LinearGradient
            colors={slide.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {slide.icon.family === 'ionicon' ? (
              <Ionicons name={slide.icon.name} size={44} color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons name={slide.icon.name} size={44} color="#FFFFFF" />
            )}
          </LinearGradient>

          <Text style={[typography.title, { color: colors.textPrimary, textAlign: 'center' }]}>{slide.title}</Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            {slide.description}
          </Text>
        </FadeInView>
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.md, alignItems: 'center' }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: spacing.xs,
            width: '100%',
            maxWidth: layout.formMaxWidth,
          }}
        >
          {SLIDES.map((s, i) => (
            <View
              key={s.title}
              style={{
                width: i === index ? 20 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === index ? colors.primary : colors.border,
              }}
            />
          ))}
        </View>

        <View style={{ width: '100%', maxWidth: layout.formMaxWidth, gap: spacing.md }}>
          {error ? <ErrorNotice message={error} onRetry={finish} /> : null}

          <GradientButton
            label={isLast ? "Let's go" : 'Next'}
            loading={finishing}
            onPress={() => (isLast ? finish() : setIndex((i) => i + 1))}
          />
        </View>
      </View>
    </View>
  );
}
