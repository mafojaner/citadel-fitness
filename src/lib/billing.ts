import { Platform } from 'react-native';
import type { MembershipTier } from './membership';
import type { BillingPeriod } from '../components/BillingPeriodToggle';

/**
 * The store product ids, which have to match RevenueCat exactly.
 *
 * Listed here rather than built by string concatenation, and mirrored by
 * PRODUCT_TIERS in the revenuecat-webhook. Those two lists are the contract
 * between the app and the entitlement it grants: a product the app can sell
 * but the webhook does not recognise takes someone's money and grants them
 * nothing, which is the worst failure this system has available.
 */
export const PRODUCT_IDS = {
  fortress: { monthly: 'fortress_monthly', yearly: 'fortress_annual' },
  valhalla: { monthly: 'valhalla_monthly', yearly: 'valhalla_annual' },
} as const;

export type PurchasableTier = 'fortress' | 'valhalla';

export function productIdFor(tier: PurchasableTier, period: BillingPeriod): string {
  return PRODUCT_IDS[tier][period];
}

export type PurchaseOutcome =
  | { kind: 'purchased'; tier: PurchasableTier }
  | { kind: 'cancelled' }
  | { kind: 'restored'; tier: MembershipTier }
  | { kind: 'nothing-to-restore' }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'failed'; message: string };

/**
 * Whether a purchase can actually be made on this device, right now.
 *
 * Three things have to be true and none of them are yet, which is why this
 * returns a reason rather than a boolean -- the interface has to explain
 * itself to whoever taps the button, and "something went wrong" would be a
 * lie about a system that is working exactly as configured.
 */
export function billingAvailability():
  | { available: true }
  | { available: false; reason: string } {
  // 1. The store SDK is a native module. There is no web storefront, and
  //    pretending otherwise would put a buy button on a page that cannot
  //    complete a sale.
  if (Platform.OS === 'web') {
    return { available: false, reason: 'Purchases are made in the iOS or Android app.' };
  }

  // 2. The SDK is not installed. Deliberately: react-native-purchases is a
  //    native module, this project has no expo-dev-client, and installing it
  //    would break Expo Go -- the only way the app currently runs on a
  //    phone -- in exchange for a purchase flow that cannot complete without
  //    the two things below either. It goes in with the first dev build.
  //    See docs/billing-setup.md; this is the only place that has to change.
  if (!SDK_INSTALLED) {
    return { available: false, reason: 'Purchasing is not switched on in this build yet.' };
  }

  // 3. The publishable key, per platform, from the RevenueCat dashboard.
  //    Absent by design until the account exists, in the same shape the
  //    telemetry wrapper uses: configured by env, inert without it, and
  //    never guessing at a default.
  if (!apiKey()) {
    return { available: false, reason: 'Purchasing is not configured yet.' };
  }

  return { available: true };
}

/**
 * Flipped to true in the same change that installs react-native-purchases.
 *
 * A constant rather than a try/require, because a require that fails at
 * runtime is a crash on the plans page rather than a disabled button, and
 * because the honest state of this feature should be readable without
 * running it.
 */
const SDK_INSTALLED = false;

function apiKey(): string | undefined {
  return Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
}

/**
 * Buy a plan.
 *
 * Returns an outcome rather than throwing, because "the person changed their
 * mind" is the most common result and is not an error. A thrown cancellation
 * would end up in an error banner telling someone something went wrong when
 * what happened is that they pressed Cancel.
 */
export async function purchase(
  _tier: PurchasableTier,
  _period: BillingPeriod
): Promise<PurchaseOutcome> {
  const availability = billingAvailability();
  if (!availability.available) {
    return { kind: 'unavailable', reason: availability.reason };
  }
  // The SDK call goes here, guarded by the same availability check above so
  // it can never run unconfigured. See docs/billing-setup.md.
  return { kind: 'unavailable', reason: 'Purchasing is not switched on in this build yet.' };
}

/**
 * Restore a purchase made on another device or after reinstalling.
 *
 * Required by Apple for any app selling a subscription, and separately by
 * the fact that people do reinstall apps. Entitlement still comes from the
 * webhook rather than from this call: restoring tells RevenueCat who you
 * are, RevenueCat tells the webhook, and the webhook writes the row. The app
 * never grants itself anything.
 */
export async function restore(): Promise<PurchaseOutcome> {
  const availability = billingAvailability();
  if (!availability.available) {
    return { kind: 'unavailable', reason: availability.reason };
  }
  return { kind: 'unavailable', reason: 'Purchasing is not switched on in this build yet.' };
}

/**
 * Where someone cancels.
 *
 * Deliberately a deep link to the platform's own subscription settings
 * rather than an in-app cancel button. Both stores own the cancellation
 * flow, an app cannot cancel on someone's behalf, and a button that appears
 * to and does not would be worse than no button.
 */
export const MANAGE_SUBSCRIPTION_URL = Platform.select({
  ios: 'https://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions',
  default: 'https://play.google.com/store/account/subscriptions',
});
