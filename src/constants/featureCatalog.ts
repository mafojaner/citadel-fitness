import { Ionicons } from '@expo/vector-icons';
import type { MembershipTier } from '../lib/membership';
import type { CurrencyCode } from '../lib/currency';
import { gradients } from '../theme/tokens';

export type FeatureTier = MembershipTier;

export interface AppFeature {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: readonly [string, string, ...string[]];
  title: string;
  description: string;
  /**
   * A shorter line for the feature cards placed around the app.
   *
   * `description` is written for the plans page, where someone is comparing
   * tiers and a parenthetical list of programs earns its space. On a card
   * dropped into the middle of the Workouts screen the same sentence is
   * three lines of prose between you and a chevron, and it stops being read
   * at all. Falls back to `description` where the full line is already
   * short enough.
   */
  short?: string;
  tier: FeatureTier;
  /** Whether this row shows up in the tier comparison table on PlansScreen. */
  showInComparison: boolean;
}

/**
 * Single source of truth for which tier each feature belongs to, read by
 * PlansScreen for both the feature-tile grid and the comparison table.
 * Before this existed, those two lists were hardcoded separately and could
 * (and did) drift out of sync with what the app actually ships for free —
 * e.g. leaderboards shipped free but stayed marked Fortress-only in both
 * places until caught. Reclassify a feature by moving its `tier` here
 * instead of editing PlansScreen directly.
 *
 * Three tiers, on a line someone can state in a sentence: Fortress tells
 * you what you did, Valhalla tells you what to do next. Records, analysis
 * and export sit in the middle; anything prescriptive sits at the top,
 * whether a coach or an algorithm does the prescribing.
 *
 * That mostly follows marginal cost per member, which is the underlying
 * reason. Video demonstrations stay in Fortress because they are filmed
 * once and then served for nothing, while the expert guide library is new
 * writing every month and so costs something every month. Wearable sync
 * sits above not because syncing is expensive but because recovery data
 * exists to change what you are told to do.
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
    // Per lift, decided on the top set of the last session -- not per set,
    // which is what this said before the feature existed to check it
    // against.
    description: 'A weight and rep target for each lift, worked out from how your last sessions actually went.',
    short: 'A weight and rep target for your next session.',
    tier: 'valhalla',
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
    short: 'Macro targets set with a coach.',
    tier: 'valhalla',
    showInComparison: true,
  },
  {
    id: 'form-check',
    icon: 'videocam',
    colors: gradients.action,
    title: 'Form check reviews',
    // "within 48 hours" until 27 August, which was a service-level promise
    // with a number on it for something nobody is staffed to answer yet.
    // The app's half is built -- upload, queue, reply -- and the cap of four
    // a month is real and enforced; the turnaround is not, so it is not
    // claimed. Put a number back here when someone is actually answering,
    // and not before.
    description: 'Send a set on video and a coach writes back on it. Four reviews a month.',
    short: 'Send a set on video, a coach writes back.',
    tier: 'valhalla',
    showInComparison: true,
  },
  {
    id: 'offline-sync',
    icon: 'cloud-done',
    colors: gradients.calendar,
    title: 'Offline mode & sync',
    // Narrowed to what is built. Workout saves queue and retry; water
    // taps and preference toggles still fail loudly, because they are cheap
    // to repeat and queueing them would promise more than ships.
    description: 'Log a workout with no signal. It saves on your phone and uploads itself the moment you are back online.',
    tier: 'fortress',
    showInComparison: false,
  },
  {
    id: 'expert-guides',
    icon: 'book',
    colors: gradients.arms,
    title: 'Expert guide library',
    description: 'In-depth programs and technique breakdowns written by coaches, with new guides added monthly.',
    short: 'Technique breakdowns written by coaches.',
    tier: 'valhalla',
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
    // "a same-day reply from a real person, every time" until 28 August.
    // Two promises, both unkeepable: a turnaround nobody is staffed for, and
    // "every time", which converts a best effort into a guarantee. What is
    // actually built is the ordering -- the queue really does put a member's
    // message above everyone else's -- so that is what it says.
    description: 'Your message goes to the front of the queue, ahead of everyone on a free plan.',
    tier: 'valhalla',
    showInComparison: true,
  },

  // ---- Paid tiers, added later ----
  {
    id: 'structured-programs',
    icon: 'calendar-number',
    colors: gradients.calendar,
    title: 'Structured programs',
    description: 'Pick a program (5x5, push/pull/legs, an 8-week hypertrophy block) and it fills in your workouts day by day.',
    short: 'Fills in your workouts, day by day.',
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
    short: 'An invite-only leaderboard for your gym crew.',
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
    tier: 'valhalla',
    showInComparison: false,
  },
  {
    id: 'video-guides',
    icon: 'play-circle',
    colors: gradients.volume,
    title: 'Video demonstrations',
    description: 'Professionally shot technique video for every exercise in the catalogue, not just a text description.',
    short: 'Technique video for every exercise.',
    // Moved up from Fortress. The old argument for keeping it low was that
    // video is filmed once and then served for nothing, so holding it higher
    // would shrink its audience and save nothing. True, but it answered the
    // wrong question: filming 125 exercises is a production budget nobody has
    // committed, and Fortress is the tier about to go on sale. A tier that
    // advertises something with no date attached earns refunds. Valhalla is
    // where the things that cost real ongoing investment already live, and
    // it is not being sold yet, so an unfunded promise does less damage here.
    tier: 'valhalla',
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

export interface TierPitch {
  tier: FeatureTier;
  /** Two families because Fortress kept the rook it has always been drawn with. */
  icon: { family: 'ionicon'; name: keyof typeof Ionicons.glyphMap } | { family: 'material-community'; name: string };
  /** One line on what you get, in the same voice for all three so they compare. */
  tagline: string;
  /**
   * What it costs. No numbers anywhere yet — billing isn't built, and a
   * price on screen before there is a way to charge it is a promise the app
   * can't keep.
   */
  price: string;
  /** Shown under the price where the tier has a real constraint. */
  note?: string;
}

/** Cheapest first — the order the plans are drawn in, and the order they unlock. */
export const TIER_ORDER: FeatureTier[] = ['free', 'fortress', 'valhalla'];

export const TIER_PITCH: Record<FeatureTier, TierPitch> = {
  free: {
    tier: 'free',
    icon: { family: 'ionicon', name: 'barbell' },
    tagline: 'Log your training and watch it add up.',
    price: 'Free, always',
  },
  fortress: {
    tier: 'fortress',
    icon: { family: 'material-community', name: 'chess-rook' },
    tagline: 'Everything you did, measured and explained.',
    // Fallback only. PlanPrice renders TIER_PRICING when a number is
    // set, which it now is, so this shows only if pricing is ever
    // cleared again.
    price: 'Pricing at launch',
  },
  valhalla: {
    tier: 'valhalla',
    icon: { family: 'material-community', name: 'hammer' },
    tagline: 'Everything Fortress has, plus people telling you what to do next.',
    price: 'Pricing at launch',
    // A coach reviewing video is hours, not server time, so this tier has a
    // ceiling the other two never will. Said on the card because it's a real
    // constraint on the product, not a scarcity tactic.
    note: 'Limited places, because a coach reviews every submission',
  },
};

/**
 * The one spot of colour a feature gets: the saturated end of its gradient.
 *
 * Paid features used to announce themselves with a gradient badge and a
 * tier-tinted glow around the card. That made every premium element the
 * loudest thing on whatever screen it sat on, and it stopped matching the
 * app once the account centre and the newsletter went flat -- a gradient
 * disc beside a row of monochrome ones reads as an advert someone dropped
 * into the page.
 *
 * Colour still identifies the feature, but on the icon rather than behind
 * it, which is the same move the newsletter made with its categories. See
 * articleCategoryInk in constants/articles.ts; these two should stay in
 * step, because they are the same decision applied twice.
 */
export function featureInk(feature: AppFeature): string {
  return feature.colors[feature.colors.length - 1];
}

/**
 * What each plan costs, and on which billing period.
 *
 * Deliberately null for the paid tiers. Nothing is on sale yet, the store
 * products do not exist, and a placeholder number on a pricing page is the
 * one kind of placeholder that gets screenshotted and quoted back at you.
 * The screen renders the whole flow around whatever is here, so filling
 * these two pairs in is all that stands between this and a real pricing
 * page -- no layout work follows.
 *
 * `annualPerMonth` is the per-month figure shown when the yearly period is
 * selected, not the annual total. Pricing pages compare like with like:
 * "$16/month billed yearly" against "$20/month billed monthly" is a
 * comparison someone can make in their head, where "$192/year" is not.
 *
 * Some of these end in .39 or .59 rather than .99, which looks like an
 * oversight and is not. This figure is never charged -- the store sells an
 * annual SKU and this is that price divided by twelve -- so it answers to
 * the arithmetic rather than to charm pricing. Forcing every one onto a .99
 * ending is what made the advertised saving drift between 18% and 22% by
 * market in the first place.
 */
export interface TierPricing {
  monthly: number | null;
  annualPerMonth: number | null;
  currency: CurrencyCode;
}

/**
 * Prices per currency, not per currency-times-a-rate.
 *
 * Each column is its own set of round local price points, chosen the way a
 * store console works, because that is where they will be entered. There is
 * no conversion anywhere in this file and there must not be: the stores
 * charge in the buyer's own currency at the tier chosen per storefront, so a
 * converted figure is a number nobody is charged, computed from a rate that
 * is stale by the time anyone reads it. See lib/currency.ts.
 *
 * The reasoning behind the two USD numbers carries across the row:
 *
 *   Fortress is software, priced against software. Strong and Hevy sit at
 *   about $4.99-$5.99 for a comparable feature set, and undercutting them
 *   says "worth less" rather than "better value".
 *
 *   Valhalla is somebody's hours. Four form checks at fifteen minutes, plus
 *   a nutrition plan and priority replies, is about ninety minutes of
 *   skilled time per member per month. The stores take 15-30%, so $79.99
 *   nets roughly $56, near $37 an hour for whoever reviews. At $49.99 the
 *   same maths lands around $23 an hour, which is not a rate a good coach
 *   works for, and a tier that cannot pay its coach stops having one.
 *
 * The non-USD rows are not that reasoning re-derived; they are the nearest
 * ordinary local price point, which is why ZAR is not simply USD times
 * eighteen. Adjust any cell without touching another.
 */
/**
 * What each plan costs in each market.
 *
 * These are price *points*, chosen per market. They are deliberately not a
 * base price times an exchange rate -- lib/currency.ts contains no rate at
 * all, for exactly this reason -- but the first version of this table was
 * filled in by converting anyway, and ZAR is where that showed. Valhalla
 * came out at R1399.99, which is $79.99 at about 17.5, and is more than a
 * year of most South African gym memberships for four video reviews and a
 * macro target. The conversion was arithmetically right and the answer was
 * unsellable.
 *
 * Two rules hold across the table, and both are checked in the comment
 * blocks below rather than by a test, so read them before editing a number:
 *
 *   1. Valhalla stays above 5x Fortress in every market. Below that the
 *      coach's share stops covering the hour their reviews take.
 *   2. The yearly saving floors to 20% on Fortress and 17% on Valhalla in
 *      every market, so the "Save X%" badge reads the same wherever you
 *      are. It used to drift between 18% and 22% by currency, because each
 *      annual figure had been picked to look tidy rather than derived.
 */
export const TIER_PRICING: Record<CurrencyCode, Record<FeatureTier, TierPricing>> = {
  USD: {
    free: { monthly: 0, annualPerMonth: 0, currency: 'USD' },
    fortress: { monthly: 4.99, annualPerMonth: 3.99, currency: 'USD' },
    valhalla: { monthly: 79.99, annualPerMonth: 65.99, currency: 'USD' },
  },
  ZAR: {
    free: { monthly: 0, annualPerMonth: 0, currency: 'ZAR' },
    fortress: { monthly: 89.99, annualPerMonth: 71.99, currency: 'ZAR' },
    // The one market priced against itself rather than against the dollar.
    // R499.99 is 5.6x Fortress where every other market is about 15x, and
    // that gap is the point: the coach-hours maths behind $79.99 assumes a
    // reviewer paid at US rates. After the store's cut R499.99 leaves about
    // R350 for the hour four reviews take, which is a normal South African
    // coaching rate, where R1399.99 was priced for somebody else's.
    valhalla: { monthly: 499.99, annualPerMonth: 414.99, currency: 'ZAR' },
  },
  GBP: {
    free: { monthly: 0, annualPerMonth: 0, currency: 'GBP' },
    fortress: { monthly: 4.49, annualPerMonth: 3.59, currency: 'GBP' },
    valhalla: { monthly: 69.99, annualPerMonth: 57.99, currency: 'GBP' },
  },
  EUR: {
    free: { monthly: 0, annualPerMonth: 0, currency: 'EUR' },
    fortress: { monthly: 5.49, annualPerMonth: 4.39, currency: 'EUR' },
    valhalla: { monthly: 84.99, annualPerMonth: 69.99, currency: 'EUR' },
  },
  AUD: {
    free: { monthly: 0, annualPerMonth: 0, currency: 'AUD' },
    fortress: { monthly: 7.99, annualPerMonth: 6.39, currency: 'AUD' },
    valhalla: { monthly: 124.99, annualPerMonth: 102.99, currency: 'AUD' },
  },
  CAD: {
    free: { monthly: 0, annualPerMonth: 0, currency: 'CAD' },
    fortress: { monthly: 6.99, annualPerMonth: 5.59, currency: 'CAD' },
    valhalla: { monthly: 109.99, annualPerMonth: 90.99, currency: 'CAD' },
  },
};

/** The prices for one tier in one currency. */
export function pricingFor(tier: FeatureTier, currency: CurrencyCode): TierPricing {
  return TIER_PRICING[currency][tier];
}
/** Whether this plan has enough set to show a price at all. */
export function isPriced(pricing: TierPricing): boolean {
  return pricing.monthly !== null;
}

/**
 * What a year actually costs, or null when there is no annual price.
 *
 * The card headlines the per-month figure because that is what compares
 * against the monthly plan, and it says "billed yearly" underneath. Both
 * were already true and neither told you the number that leaves your
 * account. This is that number.
 *
 * Derived rather than stored, which is right while nothing is purchasable
 * and worth revisiting when it is: the annual store SKU will be a price
 * point of its own, and if it is set to a tidy R4999.99 rather than the
 * R4979.88 this computes, the table has to store the total and derive the
 * per-month from it instead of the other way round.
 */
export function annualTotal(pricing: TierPricing): number | null {
  const { annualPerMonth } = pricing;
  if (annualPerMonth === null) return null;
  return Math.round(annualPerMonth * 12 * 100) / 100;
}

/**
 * The saving from paying yearly, as a whole percent, or null when there is
 * nothing to compare. Rounded down so the badge can never overstate it.
 */
export function annualSavingPct(pricing: TierPricing): number | null {
  const { monthly, annualPerMonth } = pricing;
  if (monthly === null || annualPerMonth === null || monthly <= 0) return null;
  if (annualPerMonth >= monthly) return null;
  return Math.floor(((monthly - annualPerMonth) / monthly) * 100);
}
