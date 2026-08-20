import { Ionicons } from '@expo/vector-icons';
import type { MembershipTier } from '../lib/membership';
import { gradients } from '../theme/tokens';

export type FeatureTier = MembershipTier;

export interface AppFeature {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: readonly [string, string, ...string[]];
  title: string;
  description: string;
  tier: FeatureTier;
  /** Whether this row shows up in the Free vs Fortress comparison table on FortressScreen. */
  showInComparison: boolean;
}

/**
 * Single source of truth for which tier each feature belongs to, read by
 * FortressScreen for both the feature-tile grid and the comparison table.
 * Before this existed, those two lists were hardcoded separately and could
 * (and did) drift out of sync with what the app actually ships for free —
 * e.g. leaderboards shipped free but stayed marked Fortress-only in both
 * places until caught. Reclassify a feature by moving its `tier` here
 * instead of editing FortressScreen directly.
 *
 * Three tiers, split by marginal cost per member rather than by how hard
 * something was to build. Fortress is what software serves for effectively
 * nothing extra per person — including video and written guides, which are
 * expensive to produce once and then free to serve, so putting them higher
 * would shrink their audience without saving anything. Valhalla is where a
 * human is on the other end and every member costs real hours.
 */
export const APP_FEATURES: AppFeature[] = [
  // ---- Free, live today ----
  {
    id: 'workout-logging',
    icon: 'barbell',
    colors: gradients.volume,
    title: 'Workout logging & catalogue',
    description: 'Log every set, rep, and weight from a full exercise catalogue built for the gym floor.',
    tier: 'free',
    showInComparison: true,
  },
  {
    id: 'streaks-charts',
    icon: 'flame',
    colors: gradients.flame,
    title: 'Streaks & activity charts',
    description: 'Daily streaks and volume trend charts that turn consistency into something visible.',
    tier: 'free',
    showInComparison: true,
  },
  {
    id: 'leaderboards',
    icon: 'people',
    colors: gradients.favorite,
    title: 'Friends & leaderboards',
    description: 'See where you rank against everyone on Citadel Fitness, by days logged this week.',
    tier: 'free',
    showInComparison: true,
  },

  // ---- Paid tiers ----
  {
    id: 'ai-progressive-overload',
    icon: 'sparkles',
    colors: gradients.identity,
    title: 'AI progressive overload',
    description: 'A smarter weight and rep suggestion for every set, tuned to how your last session actually went.',
    tier: 'fortress',
    showInComparison: true,
  },
  {
    id: 'advanced-analytics',
    icon: 'trending-up',
    colors: gradients.volume,
    title: 'Advanced analytics',
    description: 'Muscle-group balance, volume trends, and an estimated one-rep max for every lift you log.',
    tier: 'fortress',
    showInComparison: true,
  },
  {
    id: 'pr-vault',
    icon: 'trophy',
    colors: gradients.flame,
    title: 'Personal records vault',
    description: 'Every PR tracked automatically, with a full history so you can see exactly how far you have come.',
    tier: 'fortress',
    showInComparison: false,
  },
  {
    id: 'data-export',
    icon: 'download',
    colors: gradients.arms,
    title: 'Exercise data export',
    description: 'Download your full workout history, every set, rep, and weight, as a CSV whenever you want it.',
    tier: 'fortress',
    showInComparison: true,
  },
  {
    id: 'nutrition-coaching',
    icon: 'nutrition',
    colors: gradients.pulse,
    title: 'Nutrition coaching',
    // Was "adjusted automatically" while this sat in Fortress, which
    // described an algorithm. It's a coached service now, so the promise
    // has to move with the tier — otherwise Valhalla is charging a human
    // price for something the copy says a program does by itself.
    description: 'Macro targets set with a coach around your training load, and revisited as your program changes.',
    tier: 'valhalla',
    showInComparison: true,
  },
  {
    id: 'form-check',
    icon: 'videocam',
    colors: gradients.action,
    title: 'Form check reviews',
    description: 'Submit a set on video and get feedback from a real coach within 48 hours.',
    tier: 'valhalla',
    showInComparison: true,
  },
  {
    id: 'offline-sync',
    icon: 'cloud-done',
    colors: gradients.calendar,
    title: 'Offline mode & sync',
    description: 'Log a workout anywhere, no signal required. Everything syncs the moment you are back online.',
    tier: 'fortress',
    showInComparison: false,
  },
  {
    id: 'expert-guides',
    icon: 'book',
    colors: gradients.arms,
    title: 'Expert guide library',
    description: 'In-depth programs and technique breakdowns written by coaches, with new guides added monthly.',
    tier: 'fortress',
    showInComparison: false,
  },
  {
    id: 'early-access',
    icon: 'flash',
    colors: gradients.identity,
    title: 'Early access',
    description: 'New features land in your hands first, weeks before they reach everyone else.',
    tier: 'valhalla',
    showInComparison: false,
  },
  {
    id: 'priority-support',
    icon: 'headset',
    colors: gradients.pulse,
    title: 'Priority support',
    description: 'Skip the queue with a same-day reply from a real person, every time.',
    tier: 'valhalla',
    showInComparison: true,
  },

  // ---- Paid tiers, added later ----
  {
    id: 'structured-programs',
    icon: 'calendar-number',
    colors: gradients.calendar,
    title: 'Structured programs',
    description: 'Pick a program — 5x5, push/pull/legs, an 8-week hypertrophy block — and it fills in your workouts day by day.',
    tier: 'fortress',
    showInComparison: true,
  },
  {
    id: 'goal-forecasting',
    icon: 'flag',
    colors: gradients.reward,
    title: 'Goal forecasting',
    description: 'Set a target lift and a date. We project your trajectory from your logged history and tell you if you are on track.',
    tier: 'fortress',
    showInComparison: true,
  },
  {
    id: 'advanced-logging',
    icon: 'timer',
    colors: gradients.action,
    title: 'RPE & rest timer',
    // Tempo was in the original pitch and isn't built; the description says
    // what ships rather than what was once imagined, which is the whole
    // reason this catalogue is the single source of truth.
    description: 'Log effort (RPE) on every set, with a rest timer between them.',
    tier: 'fortress',
    showInComparison: false,
  },
  {
    id: 'private-groups',
    icon: 'people-circle',
    colors: gradients.rankGold,
    title: 'Private groups & challenges',
    // Challenges as named, stored objects aren't built; the comparison
    // window does that job. Described as what ships, same as RPE's tempo.
    description: 'Start an invite-only leaderboard for your own gym crew, and compare over any period.',
    tier: 'fortress',
    showInComparison: true,
  },
  {
    id: 'weekly-digest',
    icon: 'mail-unread',
    colors: gradients.identity,
    title: 'Weekly digest',
    description: 'A Sunday email recapping your week and what to focus on next, so you never have to wonder how you did.',
    tier: 'fortress',
    showInComparison: false,
  },
  {
    id: 'wearable-sync',
    icon: 'watch',
    colors: gradients.arms,
    title: 'Wearable sync',
    description: 'Connect Apple Health or Whoop so recovery and heart-rate data feed straight into your training suggestions.',
    tier: 'fortress',
    showInComparison: false,
  },
  {
    id: 'video-guides',
    icon: 'play-circle',
    colors: gradients.volume,
    title: 'Video demonstrations',
    description: 'Professionally shot technique video for every exercise in the catalogue, not just a text description.',
    tier: 'fortress',
    showInComparison: false,
  },
  {
    id: 'referral',
    icon: 'gift',
    colors: gradients.favorite,
    title: 'Refer & earn',
    // Attribution is live; the reward waits on billing existing. Said here
    // rather than only on the screen, so the pitch can't outrun the product.
    description: 'Invite a friend with your code. Referrals are tracked now and rewarded once memberships go on sale.',
    tier: 'fortress',
    showInComparison: false,
  },
];
