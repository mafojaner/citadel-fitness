import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { Animated, Image, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsDesktop } from '../hooks/useResponsiveLayout';
import { motion } from '../theme/motion';
import { layout } from '../theme/tokens';
import type { RootStackParamList } from './RootNavigator';
import { useTheme } from '../theme/useTheme';

/** Solid variant shown for the active tab, outline for every inactive one — the standard iOS tab-bar convention. */
const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Workouts: 'barbell',
  Activity: 'stats-chart',
  Learn: 'book',
  Search: 'search',
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
/**
 * Inset for the row of tabs from the bar's own edges. The bar uses a full
 * stadium radius (`radius.pill`), which curves much more aggressively than
 * a normal rounded rect — without this, the first and last tab sit right
 * where that curve is steepest, crowding their icon against it in a way
 * the three middle tabs never have to deal with.
 */
const ROW_INSET = 10;

export function FloatingTabBar(props: BottomTabBarProps) {
  const isDesktop = useIsDesktop();
  // MainTabs sets tabBarPosition to 'left' at the same breakpoint, so the
  // navigator lays this out as a column beside the screens rather than
  // stacked under them — the sidebar takes part in layout instead of
  // floating over content the way the phone bar does.
  return isDesktop ? <SidebarTabBar {...props} /> : <BottomPillTabBar {...props} />;
}

function BottomPillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, spacing, radius, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const showLabels = windowWidth >= LABEL_BREAKPOINT;
  const barHeight = showLabels ? 60 : 54;

  return (
    // Full-bleed positioning wrapper, invisible itself — centers the actual
    // bar below via alignItems rather than the old left/right inset, so on
    // wide (desktop web) viewports the bar caps at contentMaxWidth instead
    // of stretching edge to edge. box-none lets clicks in the now-empty
    // margin on either side fall through to whatever's underneath.
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: insets.bottom + BAR_MARGIN,
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: layout.contentMaxWidth,
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
      >
        <BlurView
          // Keyed on scheme: BlurView's tint is a native prop, same class of
          // bug as the stack header (see screenOptions.tsx) — it doesn't
          // reliably repaint on a live theme change, so force a remount
          // instead of relying on a prop update.
          key={scheme}
          intensity={80}
          tint={scheme === 'dark' ? 'dark' : 'light'}
          style={{ flex: 1, flexDirection: 'row', paddingHorizontal: ROW_INSET }}
        >
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
    </View>
  );
}

/**
 * The desktop counterpart: a fixed left rail. A bottom bar on a wide screen
 * is the clearest "this is a phone app" tell — the targets sit miles from
 * the content and the whole top-left of the window goes unused — so on
 * desktop navigation moves to the edge that has room for it, with labels
 * always visible and the brand mark at the top.
 */
function SidebarTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  // Pulled out of the route list so it can be drawn last, apart from the
  // five training tabs, while still being a genuine tab with a real focused
  // state. Absent on mobile, where MainTabs does not register it.
  const plansIndex = state.routes.findIndex((r) => r.name === 'Plans');
  const plansRoute = plansIndex >= 0 ? { route: state.routes[plansIndex], index: plansIndex } : null;

  return (
    <View
      style={{
        width: layout.sidebarWidth,
        backgroundColor: colors.navBackground,
        borderRightWidth: 1,
        borderRightColor: colors.navBorder,
        paddingTop: insets.top + spacing.lg,
        paddingBottom: insets.bottom + spacing.lg,
        paddingHorizontal: spacing.md,
        gap: spacing.xs,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.sm,
          marginBottom: spacing.lg,
        }}
      >
        {/* Static, unlike the drifting crest on the auth screens — this one
            is on screen the whole session, where idle motion is a distraction
            rather than a flourish. */}
        <View style={{ width: 32, height: 32, borderRadius: 16, overflow: 'hidden' }}>
          <Image source={require('../../assets/icon.png')} style={{ width: 32, height: 32 }} resizeMode="cover" />
        </View>
        <Text style={[typography.subheading, { color: colors.navText, letterSpacing: 0.5 }]}>Citadel</Text>
      </View>

      {state.routes.map((route, index) => {
        if (route.name === 'Plans') return null;
        const isFocused = state.index === index;
        return (
          <SidebarTabButton
            key={route.key}
            label={route.name}
            icon={TAB_ICONS[route.name] ?? 'ellipse'}
            isFocused={isFocused}
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

      <SidebarProfile />

      {/* Plans is a real tab here, registered by MainTabs on desktop only, so
          it highlights like any other. It used to push the Account stack
          instead, which covers the whole tab navigator — the sidebar
          included — so there was never a moment where a highlight could
          have been seen.

          Still drawn apart from the five: it is the account-level thing in
          a list of training ones, and the rule keeps that reading. The
          separation is now presentational rather than structural. */}
      {plansRoute ? (
        <>
          <View style={{ flex: 1 }} />
          <View style={{ height: 1, backgroundColor: colors.navBorder, marginVertical: spacing.sm }} />
          <SidebarTabButton
            label="Plans"
            icon="pricetags"
            isFocused={state.index === plansRoute.index}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: plansRoute.route.key,
                canPreventDefault: true,
              });
              if (state.index !== plansRoute.index && !event.defaultPrevented) {
                navigation.navigate(plansRoute.route.name);
              }
            }}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: plansRoute.route.key })}
            accessibilityLabel="Plans and membership"
          />
        </>
      ) : null}
    </View>
  );
}

/**
 * The way into Account, sitting under the nav items.
 *
 * Rendered as an ordinary SidebarTabButton rather than as its own thing: it
 * started out showing the avatar, name and email behind a dividing rule,
 * which made a block that looked like a different kind of control from the
 * six above it. As a plain icon and label it reads as one more destination,
 * which is what it is.
 *
 * Desktop only by construction, since SidebarTabBar is what renders it and
 * the phone never shows that. Nothing is lost there: the same route is one
 * tap from the avatar in every screen header.
 *
 * Never focused, deliberately. Account is a sibling of the whole tab
 * navigator, so opening it covers the sidebar entirely and there is no
 * state in which a highlight here could be seen. That is the same thing
 * that made Plans need to be a real tab before it could have one.
 */
function SidebarProfile() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SidebarTabButton
      label="Profile"
      icon="person"
      isFocused={false}
      // The inner screen is named explicitly because the root's Account
      // route carries nested params, so they are not optional. It also
      // documents which screen this lands on, given that stack has a route
      // with the same name as itself.
      onPress={() => navigation.navigate('Account', { screen: 'Account' })}
      onLongPress={() => {}}
      // `open-outline` is the conventional "this opens somewhere else" mark.
      // Earned here: Account is a sibling of the whole tab navigator, so
      // this row covers the sidebar rather than swapping a pane within it,
      // which is also why it can never show as focused.
      trailingIcon="open-outline"
      accessibilityLabel="Profile, opens the account centre"
    />
  );
}

interface SidebarTabButtonProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
  /**
   * Drawn small and muted at the end of the row, for an entry that does
   * something other than switch tabs. Every other row in this rail swaps the
   * pane beside it and stays highlighted; one that leaves the tab set
   * entirely should say so before it is tapped rather than after.
   */
  trailingIcon?: keyof typeof Ionicons.glyphMap;
}

function SidebarTabButton({
  label,
  icon,
  isFocused,
  onPress,
  onLongPress,
  accessibilityLabel,
  trailingIcon,
}: SidebarTabButtonProps) {
  const { colors, spacing, radius, typography, scheme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={(state) => {
        // `hovered` is react-native-web's addition to the pressable state and
        // isn't in React Native's own type, but a pointer-driven platform is
        // exactly where a hover affordance matters — so read it defensively
        // rather than going without one.
        const hovered = (state as { hovered?: boolean }).hovered ?? false;
        return {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.sm,
          borderRadius: radius.md,
          // Grey pill in both schemes: `border` is a light grey on white and
          // a dark grey on ink, so the selection sits a step away from the
          // sidebar without inverting it.
          //
          // Hover has to be a step subtler still, and no single token is
          // subtler in both schemes: `background` is offWhite in light but
          // the same near-black as the sidebar in dark, while `surface` is
          // the reverse. So it picks per scheme, or the hover state would be
          // invisible in one of them — which is what happened when this used
          // `surface` alone.
          backgroundColor: isFocused
            ? colors.border
            : hovered
              ? scheme === 'dark'
                ? colors.surface
                : colors.background
              : 'transparent',
        };
      }}
    >
      {/* One ink for every state: navText is ink900 in light and white in
          dark, so the rail is black-on-white or white-on-black and never the
          app's orange. It stays legible on the grey pill in both schemes,
          which an inverted ink would not. */}
      <Ionicons
        name={isFocused ? icon : (`${icon}-outline` as keyof typeof Ionicons.glyphMap)}
        size={ICON_SIZE}
        color={colors.navText}
      />
      <Text
        style={[typography.body, { flex: 1, minWidth: 0, color: colors.navText, fontWeight: isFocused ? '700' : '500' }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {trailingIcon ? (
        // Muted rather than full navText: it annotates the row, it is not a
        // second thing to read.
        <Ionicons name={trailingIcon} size={14} color={colors.tabInactive} />
      ) : null}
    </Pressable>
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
