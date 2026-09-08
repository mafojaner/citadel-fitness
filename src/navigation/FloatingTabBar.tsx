import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsDesktop } from '../hooks/useResponsiveLayout';
import { useMembershipTier } from '../hooks/useMembership';
import { useOpenPlans } from '../hooks/useOpenPlans';
import { APP_FEATURES } from '../constants/featureCatalog';
import { TIER_LABELS, tierAllows } from '../lib/membership';
import { motion } from '../theme/motion';
import { layout } from '../theme/tokens';
import type { RootStackParamList } from './RootNavigator';
import { LogShortcutWidget, type WheelShortcut } from '../components/LogShortcutWidget';
import { useOpenWorkoutDraft } from '../hooks/useOpenWorkoutDraft';
import { todayISO } from '../lib/analytics';
import { useOnMainScreen } from '../state/routeStore';
import { useTheme } from '../theme/useTheme';

/**
 * Solid variant shown for the active tab, outline for every inactive one —
 * the standard iOS tab-bar convention.
 *
 * Listed in the order they appear, which is the order MainTabs registers
 * them in. This is a lookup so the order here changes nothing, but a map
 * that reads left to right is one less thing to reconcile when the bar is
 * rearranged.
 *
 * Workouts is a barbell again. It was a plus for as long as the middle of
 * the bar was where the create action lived; the logging widget owns that
 * now, and two pluses on one screen -- one of them a destination, the
 * other the thing that actually creates -- is worse than none.
 */
const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Activity: 'stats-chart',
  Workouts: 'barbell',
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
export const FLOATING_TAB_BAR_CLEARANCE = 86;

/** Below this width, labels are dropped in favour of icon-only tabs — a phone in portrait, not a tablet or desktop web. */
const LABEL_BREAKPOINT = 600;

/**
 * The tabs whose stack registers Add Workout. The widget stays put on
 * these and crosses to Workouts from the other two.
 */
const TABS_WITH_ADD_WORKOUT = ['Home', 'Workouts', 'Search'];

const BAR_MARGIN = 12;
const ICON_SIZE = 22;
/**
 * The highlight behind the active icon. Wider than it is tall, so it reads
 * as a capsule sitting along the row rather than a dot orbiting the glyph —
 * the shape most bottom bars have settled on.
 *
 * The width is deliberately not a constant. Five tabs share the bar, so the
 * space each one gets depends on the screen: roughly 61px a tab at 375pt,
 * but only about 50px at 320. Any fixed width generous enough to look right
 * on the first is wide enough to make neighbouring capsules touch — or
 * overlap — on the second.
 *
 * So the capsule fills its tab instead, minus a gutter that guarantees the
 * gap, and stops growing at a cap so it does not stretch into a slab on a
 * tablet.
 */
const ACTIVE_PILL_MAX_W = 64;
const ACTIVE_PILL_H = 40;
/** Horizontal breathing room each side of a capsule, so two never meet. */
const TAB_GUTTER = 3;
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
  // Taller than the 54/60 this used to be. A floating bar that hugs its
  // icons reads as a strip of buttons; the room around them is most of what
  // makes it read as one surface. Icons stay optically centred because the
  // extra height is added to a row that centres on both axes rather than to
  // padding on one side of it.
  const barHeight = showLabels ? 70 : 62;

  // The logging widget belongs to the main screens only. Answered off the
  // focused route rather than off this navigator's nested state, which does
  // not survive a stack being mounted straight at a pushed screen -- see
  // routeStore.
  const onMainScreen = useOnMainScreen();
  // The dial carries paid destinations, so it gates them the same way the
  // desktop rail's shortcut list does rather than inventing a second rule.
  const tier = useMembershipTier();
  const openPlans = useOpenPlans();

  /**
   * Clear of the bar, and stated once so the closed widget and the one the
   * open menu redraws cannot drift apart. Both are positioned from the
   * screen edges, and this wrapper's own bottom is added back in because
   * the widget is placed inside it.
   */
  const widgetBottom = insets.bottom + BAR_MARGIN + barHeight + spacing.sm;

  /**
   * The same route into Add Workout that Home's button and the Workouts
   * calendar take, rather than a bare navigate.
   *
   * `useOpenWorkoutDraft` is not a convenience -- see its own note.
   * `save_workout` replaces a day wholesale, so a draft opened without
   * first reading what is already saved for that date starts empty, and
   * confirming it deletes whatever was logged earlier that day.
   *
   * Failure leaves you where you are, which is what Home does too: without
   * knowing what is already on the day there is nothing safe to open.
   */
  const openWorkoutDraft = useOpenWorkoutDraft();

  /**
   * Opened in the tab you are already on, wherever that tab has the screen.
   *
   * This is a shortcut, so it should land on the Add Workout the current
   * stack already owns rather than throw you into another tab's copy.
   * Home, Workouts and Search each register one; Activity and Learn do
   * not, so from those two it has to cross, and Workouts is where it goes.
   *
   * `initial: false` is the part that was actually broken. Without it, a
   * nested navigate into a stack that has not mounted yet does not push --
   * it makes the target the stack's *initial* route, so Add Workout became
   * the root with nothing beneath it. `popToTop()` on save then had
   * nothing to pop, and since it runs right after the draft is cleared,
   * confirming a workout left you sitting on a blank Add Workout instead
   * of back where you started. With it, the stack is its own screen with
   * Add Workout pushed on top, which is what every other entry point
   * produces.
   */
  const currentTab = state.routes[state.index].name;
  const tabOwningAddWorkout = TABS_WITH_ADD_WORKOUT.includes(currentTab) ? currentTab : 'Workouts';

  const openTodaysWorkout = async () => {
    try {
      await openWorkoutDraft(todayISO());
    } catch {
      return;
    }
    navigation.navigate(tabOwningAddWorkout, { screen: 'AddWorkout', initial: false });
  };
  const widgetRight = spacing.lg;

  /**
   * What the dial offers, in the order it is turned through.
   *
   * The two logging actions come first because they are what the widget is
   * for and what it opens onto; everything after them is a place, in
   * roughly the order someone reaches for it.
   *
   * Every one of these is a screen the app already registers, opened the
   * way the app already opens it. That is the whole rule for this control:
   * it is a shortcut, so it must land exactly where the long way round
   * lands, with the same state. In practice that means three things --
   * `useOpenWorkoutDraft` before Add Workout so the day is read before it
   * can be overwritten; `initial: false` on anything crossing tabs so the
   * target has its own stack root beneath it; and preferring the current
   * tab's copy of a route over another tab's. The first two are enforced by
   * guard tests, the third only by this comment.
   *
   * Locked items stay on the ring and go to Plans, which is what every
   * other locked entry point in the app does -- and what keeps the ring the
   * same shape before and after an upgrade.
   */
  const paid = (featureId: string, run: () => void) => {
    const feature = APP_FEATURES.find((f) => f.id === featureId);
    // Compared rather than equality-checked, so a Valhalla member is not
    // locked out of the Fortress features their plan includes.
    const unlocked = feature ? tierAllows(tier, feature.tier) : true;
    return { locked: !unlocked, run: unlocked ? run : openPlans };
  };

  // Home, Workouts and Search each register the catalogue; Activity and
  // Learn do not, so from those two it crosses to Workouts -- the same
  // choice, for the same reason, as Add Workout above.
  const tabOwningCatalogue = TABS_WITH_ADD_WORKOUT.includes(currentTab) ? currentTab : 'Workouts';

  const wheelShortcuts: WheelShortcut[] = [
    { key: 'workout', label: 'Add workout', icon: 'barbell', run: openTodaysWorkout },
    {
      key: 'water',
      label: 'Log water',
      icon: 'water',
      run: () => navigation.navigate('Workouts', { screen: 'WaterHistory', initial: false }),
    },
    {
      key: 'today',
      label: "Today's log",
      icon: 'today',
      run: () =>
        navigation.navigate('Workouts', {
          screen: 'DayDetail',
          params: { date: todayISO() },
          initial: false,
        }),
    },
    {
      key: 'exercises',
      label: 'Exercises',
      icon: 'list',
      run: () =>
        navigation.navigate(tabOwningCatalogue, { screen: 'ExerciseCatalogue', initial: false }),
    },
    {
      key: 'programs',
      label: 'Programme',
      icon: 'calendar-number',
      ...paid('structured-programs', () =>
        navigation.navigate('Workouts', { screen: 'Programs', initial: false })
      ),
    },
    {
      key: 'records',
      label: 'Records',
      icon: 'trophy',
      ...paid('pr-vault', () =>
        navigation.navigate('Activity', { screen: 'PersonalRecords', initial: false })
      ),
    },
    {
      key: 'goals',
      label: 'Goals',
      icon: 'flag',
      ...paid('goal-forecasting', () =>
        navigation.navigate('Activity', { screen: 'GoalForecast', initial: false })
      ),
    },
    {
      key: 'analytics',
      label: 'Analytics',
      icon: 'trending-up',
      ...paid('advanced-analytics', () =>
        navigation.navigate('Activity', { screen: 'AdvancedAnalytics', initial: false })
      ),
    },
  ];

  // The glass, in two layers.
  //
  // The blur alone is what this bar had originally, and it was removed for
  // a real reason worth keeping written down: at 62% transparent the bar's
  // background was whatever it happened to be floating over, so on Home it
  // sat on the blue water card and the inactive icons all but vanished,
  // while on Workouts it sat on white and they were fine. One bar, a
  // different legibility on every screen and at every scroll position.
  //
  // So the blur is now a backdrop rather than the surface. A tint sits on
  // top of it at an opacity high enough to put a floor under contrast no
  // matter what is behind — you still see colour and movement through it,
  // which is the whole point, but never enough to decide whether an icon is
  // legible. That is also closer to what the platforms actually ship: their
  // glass is heavily tinted, not mostly see-through.
  const glassTint = scheme === 'dark' ? 'rgba(28,34,48,0.86)' : 'rgba(255,255,255,0.85)';
  // A vertical sheen, brightest along the top edge. Cheap, and it is most of
  // the difference between "translucent panel" and "piece of glass".
  const sheen: [string, string] =
    scheme === 'dark'
      ? ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']
      : ['rgba(255,255,255,0.65)', 'rgba(255,255,255,0)'];
  // The specular top edge. A hairline lighter than the border around the
  // rest of the bar, which is what a lit surface does and a flat one does not.
  //
  // Drawn as the top border of a rounded box rather than as a straight bar
  // across the top, because the bar is a pill: its top edge is only straight
  // between the two semicircular caps. A full-width line gets clipped
  // against that curve and stops dead where each cap begins, which reads as
  // a hard line rather than a lit edge. As a border it follows the outline
  // into the caps and tapers out where the top meets the sides.
  const topEdge = scheme === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.75)';
  // The active capsule, matched to the sidebar's.
  //
  // The desktop rail fills its selected row with `border` -- a light grey
  // on white, a dark grey on ink -- and this is that same step, expressed
  // as a wash instead of a solid chip. Translucent because the bar is
  // glass: an opaque swatch would be a patch stuck on it, while a wash lets
  // the blur and the sheen carry on through, so the capsule reads as part
  // of the same surface.
  //
  // The light value used to be 0.07, which was fainter than the rail's own
  // pill and read as a smudge rather than a selection. 0.14 is roughly
  // where `border` lands once the glass is behind it.
  const activeFill = scheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(11,14,20,0.14)';

  return (
    <>
    {/* Full-bleed positioning wrapper, invisible itself — centers the actual
        bar below via alignItems rather than the old left/right inset, so on
        wide (desktop web) viewports the bar caps at contentMaxWidth instead
        of stretching edge to edge. box-none lets clicks in the now-empty
        margin on either side fall through to whatever's underneath. */}
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
          // A shadow to lift it off busy content — the actual "floating"
          // part of a floating bar.
          shadowColor: '#000',
          shadowOpacity: scheme === 'dark' ? 0.4 : 0.15,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        }}
      >
        {/* Keyed on `scheme`, and that key is the point of the layering.
          *
          * A BlurView's `tint` is a native prop that does not reliably
          * repaint when it changes, so it has to be remounted on a theme
          * switch. Last time that key lived on a BlurView that *wrapped* the
          * tab row, so every theme change remounted all five buttons with
          * it and threw away their focus animation state — a change about
          * colour resetting a thing about which tab is selected.
          *
          * Here the blur is a sibling of the row, not its parent. It can be
          * remounted as often as the theme changes and the buttons never
          * notice. */}
        <BlurView
          key={scheme}
          intensity={scheme === 'dark' ? 40 : 30}
          tint={scheme === 'dark' ? 'dark' : 'light'}
          // Android has no native backdrop blur; without this it renders as
          // a plain translucent view. The tint below is doing the legibility
          // work either way, so the fallback degrades to "slightly less
          // glassy" rather than to "unreadable".
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: glassTint }]} pointerEvents="none" />
        <LinearGradient
          colors={sheen}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: barHeight * 0.55 }}
          pointerEvents="none"
        />
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: radius.pill,
            borderWidth: 1,
            // Only the top is lit. The other three are transparent rather
            // than absent so the box keeps one uniform inset and the arc
            // tapers off at the corners instead of stopping at them.
            borderColor: 'transparent',
            borderTopColor: topEdge,
          }}
          pointerEvents="none"
        />

        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: ROW_INSET }}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            return (
              <TabButton
                key={route.key}
                label={route.name}
                showLabel={showLabels}
                icon={TAB_ICONS[route.name] ?? 'ellipse'}
                iconSize={ICON_SIZE}
                isFocused={isFocused}
                // One ink for every state, which is the rule the desktop
                // rail already follows: navText is ink900 in light and white
                // in dark, so the bar is black-on-glass or white-on-glass
                // and never the app's orange. Orange here was the accent
                // competing with itself -- it is also the streak flame, the
                // category chips, and the CTA that sits above this bar -- so
                // the one glyph that most needed to say "you are here" was
                // saying it in the app's most common colour.
                //
                // What separates the states instead is what separates them
                // on the rail: the capsule behind the active glyph, and the
                // solid-versus-outline icon. Both survive a theme switch,
                // and neither spends contrast the way a mid grey does on a
                // translucent surface -- which is what ruled out tabInactive
                // here, and why it is still right on the opaque sidebar.
                activeColor={colors.navText}
                inactiveColor={colors.navText}
                highlightColor={activeFill}
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
        </View>
      </View>

    </View>

      {onMainScreen ? (
        <LogShortcutWidget bottom={widgetBottom} right={widgetRight} shortcuts={wheelShortcuts} />
      ) : null}
    </>
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

      {/* Scrolls, because the shortcuts accordion can add five rows to a rail
          that was already six deep, and a short window would otherwise push
          Plans and Profile off the bottom with no way to reach them. The
          brand above and Plans below stay outside it: one is a header and
          the other is pinned to the foot, and neither should scroll away. */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.xs }}
        showsVerticalScrollIndicator={false}
      >
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

        <SidebarShortcuts />
      </ScrollView>

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
          {/* Last in the rail, under Plans. Both are account-level rather
              than training, and putting the person at the foot is where a
              sidebar conventionally keeps them — it also stops the ten
              shortcuts above from pushing it around as they change. */}
          <SidebarProfile />
        </>
      ) : null}
    </View>
  );
}

/**
 * Shortcuts to features that live two or three taps down inside a tab.
 *
 * Every one of these is a built Fortress feature with a real screen, and
 * every one of them is currently reached by opening a tab, scrolling, and
 * finding a link. That is fine on a phone, where the alternative is nothing;
 * on desktop the rail has the room to skip it.
 *
 * Collapsible, and collapsed by default, because this is a shortcut list
 * rather than navigation: five extra rows always open would push the five
 * actual tabs into being a minority of the rail.
 */
const SHORTCUTS: {
  /** id in APP_FEATURES, for the paid ones. Absent means free, and always open. */
  featureId?: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tab: 'Home' | 'Activity' | 'Workouts';
  screen: string;
}[] = [
  { label: 'Log a workout', icon: 'add-circle', tab: 'Workouts', screen: 'AddWorkout' },
  { label: 'Exercises', icon: 'list', tab: 'Workouts', screen: 'ExerciseCatalogue' },
  // Workouts, not Home: the card that opens this moved there, and the route
  // is registered on that stack now. Pointing it at Home would navigate to a
  // screen that stack no longer has.
  { label: 'Water', icon: 'water', tab: 'Workouts', screen: 'WaterHistory' },
  { label: 'Leaderboard', icon: 'podium', tab: 'Activity', screen: 'Leaderboard' },
  { label: 'Rewards', icon: 'diamond', tab: 'Activity', screen: 'Rewards' },
  { featureId: 'pr-vault', label: 'Personal records', icon: 'trophy', tab: 'Activity', screen: 'PersonalRecords' },
  {
    featureId: 'advanced-analytics',
    label: 'Advanced analytics',
    icon: 'trending-up',
    tab: 'Activity',
    screen: 'AdvancedAnalytics',
  },
  { featureId: 'goal-forecasting', label: 'Goals', icon: 'flag', tab: 'Activity', screen: 'GoalForecast' },
  { featureId: 'private-groups', label: 'Groups', icon: 'people-circle', tab: 'Activity', screen: 'Groups' },
  {
    featureId: 'structured-programs',
    label: 'Programs',
    icon: 'calendar-number',
    tab: 'Workouts',
    screen: 'Programs',
  },
];

function SidebarShortcuts() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tier = useMembershipTier();
  const openPlans = useOpenPlans();

  return (
    <View style={{ gap: spacing.xs }}>
      <Text
        style={[
          typography.caption,
          {
            color: colors.tabInactive,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            paddingHorizontal: spacing.sm,
            marginTop: spacing.sm,
          },
        ]}
      >
        Shortcuts
      </Text>

      {SHORTCUTS.map((shortcut) => {
        const feature = shortcut.featureId
          ? APP_FEATURES.find((f) => f.id === shortcut.featureId)
          : undefined;
        // Compared rather than equality-checked, so a Valhalla member is not
        // locked out of the Fortress features their plan includes. A
        // shortcut with no featureId is a free screen and always open.
        const unlocked = feature ? tierAllows(tier, feature.tier) : true;

        return (
          <SidebarTabButton
            key={shortcut.label}
                label={shortcut.label}
                icon={shortcut.icon}
                // Never focused: these open a screen inside a tab's stack,
                // and the rail's highlight tracks which tab is selected, not
                // how deep into it you are. Showing "Programs" as active
                // while the Workouts tab is also active would be two
                // highlights for one location.
                isFocused={false}
                // A locked shortcut goes to Plans rather than to a screen the
                // database would refuse, which is what every other locked
                // entry point in the app does.
                onPress={() =>
                  unlocked
                    ? navigation.navigate('Main', {
                        screen: shortcut.tab,
                        // Every shortcut here points below a tab's root, so
                        // the target stack needs its own root underneath --
                        // see useOpenActivityScreen for what happens
                        // without it.
                        params: { screen: shortcut.screen, initial: false },
                      } as never)
                    : openPlans()
                }
                onLongPress={() => {}}
                trailingIcon={unlocked ? undefined : 'lock-closed'}
                accessibilityLabel={
                  unlocked
                    ? shortcut.label
                    : `${shortcut.label}, ${feature ? TIER_LABELS[feature.tier] : 'paid'} feature. Opens plans.`
                }
              />
        );
      })}
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
  /** Set per tab, so the centre create action can draw larger than the rest. */
  iconSize: number;
  isFocused: boolean;
  activeColor: string;
  inactiveColor: string;
  /** Fill of the capsule behind the active icon. */
  highlightColor: string;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
}

function TabButton({
  label,
  showLabel,
  icon,
  iconSize,
  isFocused,
  activeColor,
  inactiveColor,
  highlightColor,
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
  // The capsule grows in from slightly under its final size rather than
  // fading in at full width, so switching tabs reads as the highlight
  // moving to the new one instead of two of them cross-dissolving.
  const pillScale = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: TAB_GUTTER }}
    >
      {/* Centred on both axes, with the capsule and the glyph both centred
          inside it. The icon's position is set by this box rather than by
          the capsule, so the two cannot drift apart and the glyph stays put
          whether or not its tab is the selected one. */}
      <View
        style={{
          width: '100%',
          maxWidth: ACTIVE_PILL_MAX_W,
          height: ACTIVE_PILL_H,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: ACTIVE_PILL_H,
            // Half the *short* side, which is what makes the ends
            // semicircular and the shape a capsule rather than a rounded
            // rectangle.
            borderRadius: ACTIVE_PILL_H / 2,
            backgroundColor: highlightColor,
            opacity: focusAnim,
            transform: [{ scale: pillScale }],
          }}
        />
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons
            name={isFocused ? icon : (`${icon}-outline` as keyof typeof Ionicons.glyphMap)}
            size={iconSize}
            color={isFocused ? activeColor : inactiveColor}
          />
        </Animated.View>
      </View>
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
