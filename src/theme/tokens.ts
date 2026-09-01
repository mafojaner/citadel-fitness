export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

// Caps content width on wide (desktop web) viewports so the mobile-first
// layout doesn't stretch edge-to-edge — centered via alignSelf on whichever
// element gets capped, same pattern the landing page and privacy policy
// already use for their own readable-column widths.
export const layout = {
  contentMaxWidth: 640,
  /** Wider cap once there's a sidebar taking the left edge and screens lay
      content out in columns — 640 there is the "phone app in the middle of a
      monitor" look rather than a desktop layout. */
  desktopContentMaxWidth: 1120,
  /** Narrower cap for single-column forms (auth screens) — 640 reads as an
      oddly wide text input; a login form wants roughly phone-width even on desktop. */
  formMaxWidth: 420,
  sidebarWidth: 232,
} as const;

// Shape only — shadowColor/shadowRadius/shadowOffset don't need to vary by
// scheme, but shadowOpacity does (a shadow tuned to read on white is
// invisible on near-black), so each consumer adds
// `shadowOpacity: scheme === 'dark' ? X : Y` and its own `elevation`
// itself, matching the pattern FloatingTabBar already established rather
// than inventing a second theming mechanism.
export const shadow = {
  card: { shadowColor: '#000', shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  floating: { shadowColor: '#000', shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const },
  heading: { fontSize: 20, fontWeight: '600' as const },
  subheading: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
};

const palette = {
  ink900: '#0B0E14',
  ink700: '#1C2230',
  ink500: '#4A5468',
  ink300: '#8A93A6',
  ink100: '#D8DCE4',
  white: '#FFFFFF',
  offWhite: '#F5F6F8',
  primary: '#FF5A36',
  primaryMuted: '#FFDACE',
  success: '#2FB380',
  danger: '#E24C4C',
};

export const lightColors = {
  background: palette.offWhite,
  surface: palette.white,
  border: palette.ink100,
  textPrimary: palette.ink900,
  textSecondary: palette.ink500,
  textMuted: palette.ink300,
  primary: palette.primary,
  primaryMuted: palette.primaryMuted,
  // The inverse surface.
  //
  // A slab that deliberately contrasts with the page instead of sitting on
  // it: near-black on the light theme, white on the dark one. It exists so
  // one element on a screen can be the thing you are meant to reach for
  // without reaching for colour to say so -- `primary` fills already mean
  // "the app's own accent" on the rewards and water cards, and a second
  // orange slab beside those would read as the same feature.
  //
  // The four values move together and are only meaningful together, which
  // is why they are tokens rather than four literals at the call site: any
  // component that fills with `inverseSurface` needs the matching ink, the
  // translucent well for an icon, and the hairline for a chip, or it will
  // paint white-on-white the moment the theme flips.
  // ink700 and offWhite rather than the ends of the palette. Pure #000 on
  // #FFF is the pairing that makes a slab read as a hole punched in the
  // page instead of a card resting on it, and it is the one combination in
  // the palette that appears nowhere else in the app -- every other surface
  // already lives one step in from the extremes.
  inverseSurface: palette.ink700,
  inverseText: palette.offWhite,
  inverseWell: 'rgba(255,255,255,0.14)',
  inverseBorder: 'rgba(255,255,255,0.35)',
  success: palette.success,
  danger: palette.danger,
  tabInactive: '#8A93A6',
  navBackground: palette.white,
  navText: palette.ink900,
  navBorder: palette.ink100,
};

export const darkColors = {
  background: palette.ink900,
  surface: palette.ink700,
  border: '#2A3140',
  textPrimary: palette.white,
  textSecondary: palette.ink100,
  textMuted: palette.ink300,
  primary: palette.primary,
  primaryMuted: '#4A2A20',
  // Mirrored, not copied: on a near-black page the high-contrast slab is
  // the white one. See lightColors for why these four travel together.
  inverseSurface: palette.offWhite,
  inverseText: palette.ink900,
  inverseWell: 'rgba(11,14,20,0.08)',
  inverseBorder: 'rgba(11,14,20,0.22)',
  success: palette.success,
  danger: palette.danger,
  // ink300, not ink500. Against the bar's own surface (ink700) ink500 is
  // 2.1:1 -- an icon you have to hunt for, and it was worse still while the
  // bar was translucent and the page showed through. ink300 is 5.2:1 there
  // and 7:1 on the sidebar's navBackground, and it matches the light theme's
  // value, so an inactive tab is now the same grey in both schemes.
  tabInactive: palette.ink300,
  // Matches `background` rather than a separate near-black value — the
  // mismatch between the two was exactly what read as a distinct dark bar
  // sitting on top of the page.
  navBackground: palette.ink900,
  navText: palette.white,
  navBorder: '#1C2230',
};

export type ThemeColors = typeof lightColors;

// Solid blue used by the water intake card and its detail screen — shared
// so the screen you land on after tapping the card is unmistakably the same
// feature, not a re-themed generic page. Same reasoning as RewardsCard's
// solid orange; see WaterIntakeCard.
export const waterBlue = '#3B82F6';

// Accent gradients for stat badges — deliberately vivid against the
// otherwise neutral card surfaces, shared across light and dark theme.
export const gradients = {
  flame: ['#FF5A36', '#FF3D81'],
  calendar: ['#FF5A36', '#8B5CF6'],
  reward: ['#FFB020', '#FF5A36'],
  pulse: ['#FF5A36', '#22D3EE'],
  volume: ['#FF8A36', '#FFC837'],
  identity: ['#8B5CF6', '#FF5A36'],
  action: ['#FF8A65', '#FF5A36'],
  arms: ['#22D3EE', '#34D399'],
  favorite: ['#FF3D81', '#E24C4C'],
  rankGold: ['#FFDE7A', '#F5A623'],
  rankSilver: ['#EAF0F7', '#9CA9B8'],
  rankBronze: ['#E4A472', '#A15C2E'],
  water: ['#22D3EE', '#3B82F6'],
} as const;

/**
 * The key colour for each membership tier.
 *
 * Fortress is white and Valhalla is black — the two ends of the palette, so
 * the pair reads as a ladder at a glance rather than as two arbitrary
 * accents. Free is deliberately unbranded: it uses the theme's own surface,
 * because giving the tier nobody pays for a signature colour would put it
 * on the same footing as the two that cost money.
 *
 * Both accents keep their colour in both schemes rather than flipping, or
 * "Fortress is the white one" would stop being true half the time. What
 * changes per scheme is only what keeps them visible: white-on-white and
 * black-on-black both need a border, and each gets one exactly where its
 * fill would otherwise disappear into the page.
 */
export interface TierAccent {
  /** Fill for the plan card's header and its badge. */
  accent: string;
  /** Text and icons drawn on top of `accent`. */
  onAccent: string;
  /** Outline, so a fill matching the page behind it still reads as a shape. */
  border: string;
}

export function tierAccents(scheme: 'light' | 'dark'): Record<'free' | 'fortress' | 'valhalla', TierAccent> {
  const dark = scheme === 'dark';
  return {
    free: {
      // Plain grey, not a signature colour — but a grey far enough from the
      // card surface to still read as a header. The first attempt reused
      // `surface` itself, which made the free plan's header vanish into the
      // body of its own card in dark mode.
      accent: dark ? palette.ink500 : palette.ink300,
      onAccent: dark ? palette.white : palette.ink900,
      border: dark ? palette.ink500 : palette.ink300,
    },
    fortress: {
      accent: palette.white,
      // Never white-on-white: the fill is fixed, so the text on it is too.
      onAccent: palette.ink900,
      // Only light mode needs a contrasting outline — on a near-black page a
      // white card is already the highest-contrast thing on screen.
      border: dark ? palette.white : palette.ink300,
    },
    valhalla: {
      accent: palette.ink900,
      onAccent: palette.white,
      // The mirror of Fortress: black is the colour that disappears in dark
      // mode, so that's where it gets the outline.
      border: dark ? palette.ink500 : palette.ink900,
    },
  };
}
