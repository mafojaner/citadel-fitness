import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { Animated, Easing, Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../state/authStore';
import { useProfileStore } from '../state/profileStore';
import { gradients } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

interface WelcomeBackBannerProps {
  /** Drives the subline. Passed in rather than fetched so the banner adds no request of its own. */
  streakDays: number;
}

const ENTER_MS = 420;
const HOLD_MS = 2800;
const EXIT_MS = 280;
const MAX_WIDTH = 420;
/**
 * Clears the screen title row (measured at 38px tall, sitting 8px below the
 * safe area) so the greeting drops in under the header rather than sitting
 * on top of it and hiding where you are.
 */
const HEADER_CLEARANCE = 56;

/**
 * The greeting shown when someone signs back in. Plays once and leaves,
 * rather than sitting on screen as another thing to dismiss — and nothing
 * about it loops, so it never becomes ambient motion.
 *
 * Only transform and opacity are animated, so useNativeDriver works and the
 * whole thing is composited on the GPU, matching WorkoutSavedAnimation.
 */
export function WelcomeBackBanner({ streakDays }: WelcomeBackBannerProps) {
  const { spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const name = useProfileStore((s) => s.name);
  const avatarUrl = useProfileStore((s) => s.avatarUrl);
  const clearJustSignedIn = useAuthStore((s) => s.clearJustSignedIn);

  // Read once at mount and drive visibility locally: the store flag is
  // consumed immediately below, and reading it live would unmount the banner
  // mid-animation the moment it cleared.
  const [shouldShow] = useState(() => useAuthStore.getState().justSignedIn);
  const [progress] = useState(() => new Animated.Value(0));
  const [gone, setGone] = useState(false);

  const dismiss = useCallback(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration: EXIT_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setGone(true));
  }, [progress]);

  useEffect(() => {
    if (!shouldShow) return;
    clearJustSignedIn();

    Animated.timing(progress, {
      toValue: 1,
      duration: ENTER_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const timeout = setTimeout(dismiss, ENTER_MS + HOLD_MS);
    return () => clearTimeout(timeout);
  }, [shouldShow, clearJustSignedIn, progress, dismiss]);

  if (!shouldShow || gone) return null;

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] });
  const greeting = name ? `Welcome back, ${name.split(' ')[0]}` : 'Welcome back';
  const subline =
    streakDays > 0
      ? `${streakDays} day streak. Keep it going.`
      : "Good to see you. Let's log today's session.";

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + HEADER_CLEARANCE,
        left: spacing.md,
        right: spacing.md,
        alignItems: 'center',
        zIndex: 20,
        opacity: progress,
        transform: [{ translateY }],
      }}
    >
      <Pressable
        onPress={dismiss}
        accessibilityRole="button"
        accessibilityLabel={`${greeting}. ${subline} Select to dismiss.`}
        style={{ width: '100%', maxWidth: MAX_WIDTH }}
      >
        <LinearGradient
          colors={gradients.flame}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.md,
            borderRadius: radius.lg,
            shadowColor: gradients.flame[gradients.flame.length - 1],
            shadowOpacity: 0.45,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 10,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.22)',
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.5)',
            }}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: 44, height: 44 }} />
            ) : (
              <Ionicons name="flame" size={22} color="#FFFFFF" />
            )}
          </View>

          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[typography.subheading, { color: '#FFFFFF' }]} numberOfLines={1}>
              {greeting}
            </Text>
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.9)' }]} numberOfLines={1}>
              {subline}
            </Text>
          </View>

          <Ionicons name="close" size={18} color="rgba(255,255,255,0.75)" />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
