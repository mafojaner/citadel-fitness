/**
 * Which currency the plan prices are shown in.
 *
 * The important thing about this file is what it deliberately does NOT do:
 * convert. There is no exchange rate anywhere here, and there should never
 * be one.
 *
 * When billing goes live it goes through App Store Connect and Play
 * Console, and those charge in the currency of the buyer's *store account*,
 * at price points chosen per storefront. A picker that took $4.99 and
 * multiplied by a rate would show "£3.87" -- a number no store will ever
 * charge, from a rate that goes stale the day it is written, next to a
 * button the person is about to trust. Showing someone a price they are not
 * charged is the one mistake a pricing page cannot recover from.
 *
 * So each currency carries its own price points, the way the store consoles
 * actually work: round local numbers, set per market, not derived from each
 * other. They are what to enter in the consoles, and they are what the app
 * shows.
 */

export type CurrencyCode = 'USD' | 'GBP' | 'EUR' | 'ZAR' | 'AUD' | 'CAD';

export interface CurrencyInfo {
  code: CurrencyCode;
  /** Prefixed to the amount. Kept short so a price stays a glanceable number. */
  symbol: string;
  /** Shown in the picker, where the code alone is not obvious to everyone. */
  label: string;
}

/**
 * Ordered with the app's own market first rather than alphabetically. The
 * list is short on purpose: every entry is a set of prices somebody has to
 * maintain in two store consoles, so adding one is a commitment rather
 * than a line of code.
 */
export const CURRENCIES: readonly CurrencyInfo[] = [
  { code: 'ZAR', symbol: 'R', label: 'South African rand' },
  { code: 'USD', symbol: '$', label: 'US dollar' },
  { code: 'GBP', symbol: '£', label: 'British pound' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'AUD', symbol: 'A$', label: 'Australian dollar' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian dollar' },
];

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && CURRENCIES.some((c) => c.code === value);
}

/**
 * Falls back to the default rather than throwing.
 *
 * A stored preference can outlive the currency it names -- a market gets
 * dropped, or a row is written by an older build. A pricing page that
 * crashes on an unrecognised code is worse than one that shows dollars.
 */
export function parseCurrency(value: unknown): CurrencyCode {
  return isCurrencyCode(value) ? value : DEFAULT_CURRENCY;
}

export function currencyInfo(code: CurrencyCode): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[1];
}

/**
 * "R89.99", "$4.99", "£4.49".
 *
 * Two decimals always, because these are all .99-style price points and
 * "R90" beside "$4.99" reads as two different kinds of number. Zero is the
 * one exception: the free plan says "Free" elsewhere and never reaches
 * here, but if it ever does, "R0.00" would be worse than "R0".
 */
export function formatPrice(amount: number, code: CurrencyCode): string {
  const { symbol } = currencyInfo(code);
  if (amount === 0) return `${symbol}0`;
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * The sentence that has to be on the plans page somewhere.
 *
 * Nothing in this app converts anything, so the prices shown are real
 * listed prices. But the stores bill in the currency of the buyer's own
 * store account -- someone with a US account can read rand here and still
 * be charged dollars. Saying that once, plainly, costs less than the
 * support thread about a card statement.
 *
 * It lives behind the info toggle rather than always on screen, because it
 * is an explanation rather than a control and the top of that page was six
 * lines of prose before the first plan. Behind a disclosure is not the same
 * as deleted.
 */
export function currencyNote(code: CurrencyCode): string {
  return (
    `Prices are shown in ${currencyInfo(code).label}. The App Store and Google Play charge in ` +
    'the currency of your own store account, so that is what a card statement will show.'
  );
}
