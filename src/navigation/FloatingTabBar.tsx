import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { Animated, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { motion } from '../theme/motion';
import { useTheme } from '../theme/useTheme';

/** Solid variant shown for the active tab, outline for every inactive one — the standard iOS tab-bar convention. */
const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Workouts: 'barbell',
  Rewards: 'diamond',
  Activity: 'stats-chart',
  Learn: 'book',
};

/**
 * Total space the floating bar occupies at the bottom of the screen,
 * including its margin from the edge — screens need to reserve this much
 * bottom padding so their last row of content never ends up hidden behind
 * a bar that floats over content instead of participating in layout.
 * Sized for the taller labelled variant; safe (just a little generous) on
 * the shorter icon-only one.
 */
export const FLOATING_TAB_BAR_CLEARANCE = 78;

/** Below this width, labels are dropped in favour of icon-only tabs — a phone in portrait, not a tablet or desktop web. */
const LABEL_BREAKPOINT = 600;

const BAR_MARGIN = 12;
const ICON_SIZE = 22;
/** Fixed size of the icon-only highlight — a compact bubble around just the icon, not a full-segment pill. */
const COMPACT_INDICATOR_SIZE = 44;
/**
 * Inset for the row of tabs from the bar's own edges. The bar uses a full
 * stadium radius (`radius.pill`), which curves much more aggressively than
 * a normal rounded rect — without this, the first and last tab sit right
 * where that curve is steepest, crowding their icon and highlight against
 * it in a way the three middle tabs never have to deal with.
 */
const ROW_INSET = 10;

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, spacing, radius, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const showLabels = windowWidth >= LABEL_BREAKPOINT;
  const barHeight = showLabels ? 60 : 54;

  const [barWidth, setBarWidth] = useState(0);
  const rowWidth = Math.max(0, barWidth - ROW_INSET * 2);
  const tabWidth = rowWidth / state.routes.length;
  const indicatorSize = showLabels ? tabWidth - 12 : COMPACT_INDICATOR_SIZE;
  const indicatorHeight = showLabels ? barHeight - 12 : COMPACT_INDICATOR_SIZE;

  const [indexAnim] = useState(() => new Animated.Value(state.index));
  useEffect(() => {
    Animated.spring(indexAnim, {
      toValue: state.index,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
  }, [state.index, indexAnim]);

  // Centres the indicator within each tab's segment regardless of its size,
  // so the same formula covers both the full-width labelled pill and the
  // smaller icon-only bubble.
  const indicatorTranslateX =
    barWidth === 0
      ? 0
      : indexAnim.interpolate({
          inputRange: state.routes.map((_, i) => i),
          outputRange: state.routes.map(
            (_, i) => ROW_INSET + i * tabWidth + (tabWidth - indicatorSize) / 2
          ),
        });

  return (
    <View
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        bottom: insets.bottom + BAR_MARGIN,
        height: barHeight,
        borderRadius: radius.pill,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.navBorder,
        // Blur alone can render flat without a shadow to lift it off busy
        // content — the actual "floating" part of a floating bar.
        shadowColor: '#000',
        shadowOpacity: scheme === 'dark' ? 0.4 : 0.15,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      }}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
    >
      <BlurView
        intensity={80}
        tint={scheme === 'dark' ? 'dark' : 'light'}
        style={{ flex: 1, flexDirection: 'row', paddingHorizontal: ROW_INSET }}
      >
        {barWidth > 0 ? (
          <Animated.View
            style={{
              position: 'absolute',
              top: (barHeight - indicatorHeight) / 2,
              left: 0,
              width: indicatorSize,
              height: indicatorHeight,
              borderRadius: radius.pill,
              backgroundColor: colors.primaryMuted,
              transform: [{ translateX: indicatorTranslateX }],
            }}
          />
        ) : null}

        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          return (
            <TabButton
              key={route.key}
              label={route.name}
              showLabel={showLabels}
              icon={TAB_ICONS[route.name] ?? 'ellipse'}
              isFocused={isFocused}
              activeColor={colors.primary}
              inactiveColor={colors.tabInactive}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
            />
          );
        })}
      </BlurView>
    </View>
  );
}

interface TabButtonProps {
  label: string;
  showLabel: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  isFocused: boolean;
  activeColor: string;
  inactiveColor: string;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
}

function TabButton({
  label,
  showLabel,
  icon,
  isFocused,
  activeColor,
  inactiveColor,
  onPress,
  onLongPress,
  accessibilityLabel,
}: TabButtonProps) {
  const [focusAnim] = useState(() => new Animated.Value(isFocused ? 1 : 0));
  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: motion.duration.fast,
      useNativeDriver: true,
    }).start();
  }, [isFocused, focusAnim]);

  const scale = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={isFocused ? icon : (`${icon}-outline` as keyof typeof Ionicons.glyphMap)}
          size={ICON_SIZE}
          color={isFocused ? activeColor : inactiveColor}
        />
      </Animated.View>
      {showLabel ? (
        <Text
          style={{
            fontSize: 10,
            fontWeight: isFocused ? '700' : '500',
            color: isFocused ? activeColor : inactiveColor,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}
