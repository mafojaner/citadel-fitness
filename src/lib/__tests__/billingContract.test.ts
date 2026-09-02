/// <reference types="node" />
//
// Referenced here for the same reason migrationInserts.test.ts does it: this
// file reads from disk, a React Native bundle has no `fs`, and making Node's
// globals ambient everywhere would let an import of it typecheck in a screen
// and fail on a device.
import { readFileSync } from 'fs';
import { join } from 'path';
import { PRODUCT_IDS, productIdFor } from '../billing';

/**
 * The product ids are a contract across three files, and nothing enforced it.
 *
 * The app sells a product by its id. RevenueCat charges for it. The webhook
 * grants a tier by looking that id up in its own map. If the app can sell
 * something the webhook does not recognise, the webhook answers 200 with
 * `{ ignored: "Unknown product" }` -- deliberately, so RevenueCat stops
 * retrying -- and the member has paid and been granted nothing. No error is
 * raised anywhere, nothing appears in a log the app can see, and the first
 * report is a person saying they were charged and have no features.
 *
 * That is the worst failure this system has available, and until this test
 * it was one careless rename away in either file.
 *
 * The webhook is read as text rather than imported: it is Deno, it imports
 * from npm: specifiers, and Jest cannot load it. Reading it is enough,
 * because the failure being guarded against is a name that stops matching,
 * not a logic error.
 */
const WEBHOOK = readFileSync(
  join(__dirname, '..', '..', '..', 'supabase', 'functions', 'revenuecat-webhook', 'index.ts'),
  'utf8'
);

/** The keys of PRODUCT_TIERS in the webhook, and the tier each maps to. */
function webhookProductTiers(): Record<string, string> {
  const block = WEBHOOK.match(
    /const PRODUCT_TIERS: Record<string, 'fortress' \| 'valhalla'> = \{([\s\S]*?)\};/
  );
  if (!block) throw new Error('Could not find PRODUCT_TIERS in the webhook');
  const entries: Record<string, string> = {};
  for (const line of block[1].split('\n')) {
    const m = line.match(/^\s*([a-z_]+):\s*'(fortress|valhalla)'/);
    if (m) entries[m[1]] = m[2];
  }
  return entries;
}

describe('the product id contract between the app and the webhook', () => {
  const webhookTiers = webhookProductTiers();

  it('finds the webhook map at all', () => {
    // If this fails the rest of the file is vacuous -- a regex that matches
    // nothing would let every assertion below pass against an empty object.
    expect(Object.keys(webhookTiers).length).toBeGreaterThan(0);
  });

  it('sells nothing the webhook cannot grant', () => {
    const sold = Object.values(PRODUCT_IDS).flatMap((byPeriod) => Object.values(byPeriod));
    for (const productId of sold) {
      expect(webhookTiers[productId]).toBeDefined();
    }
  });

  it('grants the tier the app actually sold, not merely some tier', () => {
    // A product mapped to the wrong tier is worse than an unknown one: it
    // completes silently and hands over the wrong thing. Someone pays for
    // Valhalla and gets Fortress, and every gate agrees they are entitled.
    for (const [tier, byPeriod] of Object.entries(PRODUCT_IDS)) {
      for (const productId of Object.values(byPeriod)) {
        expect(webhookTiers[productId]).toBe(tier);
      }
    }
  });

  it('has no product in the webhook the app cannot sell', () => {
    // The other direction. A webhook entry with no product behind it is not
    // dangerous, but it is a name nobody is maintaining, and it is exactly
    // where a rename leaves its other half.
    const sold = new Set(
      Object.values(PRODUCT_IDS).flatMap((byPeriod) => Object.values(byPeriod))
    );
    for (const productId of Object.keys(webhookTiers)) {
      expect(sold.has(productId)).toBe(true);
    }
  });

  it('resolves a distinct product for every tier and period', () => {
    const ids = [
      productIdFor('fortress', 'monthly'),
      productIdFor('fortress', 'yearly'),
      productIdFor('valhalla', 'monthly'),
      productIdFor('valhalla', 'yearly'),
    ];
    expect(new Set(ids).size).toBe(4);
  });

  it('keeps the webhook refusing an unknown product rather than guessing', () => {
    // The safety net behind all of the above. If this ever gains a fallback
    // -- a default tier, a "contains valhalla" rule -- then a typo stops
    // being a caught mistake and becomes a free subscription.
    expect(WEBHOOK).toContain('Unknown product');
    expect(WEBHOOK).not.toMatch(/PRODUCT_TIERS\[[^\]]+\]\s*(\|\||\?\?)/);
  });
});
