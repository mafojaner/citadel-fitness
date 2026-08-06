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
  success: palette.success,
  danger: palette.danger,
  tabInactive: palette.ink500,
  // Matches `background` rather than a separate near-black value — the
  // mismatch between the two was exactly what read as a distinct dark bar
  // sitting on top of the page.
  navBackground: palette.ink900,
  navText: palette.white,
  navBorder: '#1C2230',
};

export type ThemeColors = typeof lightColors;

// Accent gradients for stat badges — deliberately vivid against the
// otherwise neutral card surfaces, shared across light and dark theme.
export const gradients = {
  flame: ['#FF5A36', '#FF3D81'],
  calendar: ['#FF5A36', '#8B5CF6'],
  pulse: ['#FF5A36', '#22D3EE'],
  volume: ['#FF8A36', '#FFC837'],
  identity: ['#8B5CF6', '#FF5A36'],
  action: ['#FF8A65', '#FF5A36'],
  arms: ['#22D3EE', '#34D399'],
  favorite: ['#FF3D81', '#E24C4C'],
} as const;
