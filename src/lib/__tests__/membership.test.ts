import {
  annualSavingPct,
  APP_FEATURES,
  pricingFor,
  TIER_ORDER,
  TIER_PITCH,
} from '../../constants/featureCatalog';
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  formatPrice,
  isCurrencyCode,
  parseCurrency,
} from '../currency';
import { TIER_LABELS, parseTier, tierAllows, tierRank } from '../membership';

describe('tierRank', () => {
  it('orders free below fortress below valhalla', () => {
    expect(tierRank('free')).toBeLessThan(tierRank('fortress'));
    expect(tierRank('fortress')).toBeLessThan(tierRank('valhalla'));
  });
});

describe('tierAllows', () => {
  it('grants everything at or below your tier', () => {
    expect(tierAllows('valhalla', 'valhalla')).toBe(true);
    expect(tierAllows('valhalla', 'fortress')).toBe(true);
    expect(tierAllows('valhalla', 'free')).toBe(true);
    expect(tierAllows('fortress', 'fortress')).toBe(true);
    expect(tierAllows('fortress', 'free')).toBe(true);
    expect(tierAllows('free', 'free')).toBe(true);
  });

  it('refuses anything above your tier', () => {
    expect(tierAllows('free', 'fortress')).toBe(false);
    expect(tierAllows('free', 'valhalla')).toBe(false);
    expect(tierAllows('fortress', 'valhalla')).toBe(false);
  });

  it('gives Valhalla members the Fortress features', () => {
    // The bug an equality check would introduce, and the one that would
    // only ever affect the members paying the most.
    const fortressFeatures = APP_FEATURES.filter((f) => f.tier === 'fortress');
    expect(fortressFeatures.length).toBeGreaterThan(0);
    for (const feature of fortressFeatures) {
      expect(tierAllows('valhalla', feature.tier)).toBe(true);
    }
  });

  it('does not give Fortress members the Valhalla features', () => {
    const valhallaFeatures = APP_FEATURES.filter((f) => f.tier === 'valhalla');
    expect(valhallaFeatures.length).toBeGreaterThan(0);
    for (const feature of valhallaFeatures) {
      expect(tierAllows('fortress', feature.tier)).toBe(false);
    }
  });
});

describe('parseTier', () => {
  it('accepts the known tiers', () => {
    expect(parseTier('free')).toBe('free');
    expect(parseTier('fortress')).toBe('fortress');
    expect(parseTier('valhalla')).toBe('valhalla');
  });

  it('falls back to free for anything unrecognised', () => {
    // A tier this build doesn't know about must read as the least
    // privileged, never the most — an unknown string granting access would
    // be the worst possible default.
    expect(parseTier('platinum')).toBe('free');
    expect(parseTier('')).toBe('free');
    expect(parseTier(null)).toBe('free');
    expect(parseTier(undefined)).toBe('free');
  });
});

describe('the catalogue', () => {
  it('labels every tier it uses', () => {
    for (const feature of APP_FEATURES) {
      expect(TIER_LABELS[feature.tier]).toBeTruthy();
    }
  });

  it('puts everything prescriptive in Valhalla', () => {
    // Fortress tells you what you did; Valhalla tells you what to do next,
    // whether a coach or an algorithm does the prescribing. Pinned because
    // the line is easy to blur one feature at a time.
    const valhallaIds = APP_FEATURES.filter((f) => f.tier === 'valhalla').map((f) => f.id).sort();
    expect(valhallaIds).toEqual([
      'ai-progressive-overload',
      'early-access',
      'expert-guides',
      'form-check',
      'nutrition-coaching',
      'priority-support',
      'video-guides',
      'wearable-sync',
    ]);
  });

  it('promises no turnaround time nobody is staffed to keep', () => {
    // Form check said "within 48 hours" until 27 August. The app's half of
    // that feature is real -- upload, queue, reply, and a cap of four a
    // month that is enforced in the database -- but the turnaround depends
    // on a coach who does not exist yet, and a number in the catalogue is a
    // promise the product cannot keep.
    //
    // This is the same guard as the no-automation one below, for the same
    // reason: the catalogue is the contract, and a specific figure is the
    // hardest kind of claim to walk back once someone has read it.
    // Word boundaries are written as character classes rather than \b on
    // purpose. The first draft of this line was generated through a shell
    // pipeline that lost an escaping level and wrote a literal 0x08
    // backspace where the boundary was meant, so the regex looked for a
    // control character, matched nothing, and reported the catalogue
    // clean while it still said "within 48 hours". The CI guard caught
    // the stray byte; nothing would have caught the silently-passing
    // test.
    const timePromise =
      /(^|[^A-Za-z])(within|in under|in less than|guaranteed)([^.]*)(hour|day|minute)s?([^A-Za-z]|$)/i;
    // "same-day" says a turnaround without using any of the words above,
    // which is exactly how priority support kept its promise through the
    // first version of this guard. So does "every time", which turns a best
    // effort into a guarantee without naming a duration at all.
    const impliedPromise = /(same[- ]day|same[- ]hour|every time|always within)/i;
    const offenders = APP_FEATURES.filter(
      (f) => timePromise.test(f.description) || impliedPromise.test(f.description)
    ).map((f) => f.id);
    expect(offenders).toEqual([]);
  });

  it('leaves every shipped feature in Fortress', () => {
    // Promoting a built feature would take something Fortress can
    // demonstrate today and put it behind a tier that ships nothing yet.
    for (const id of [
      'pr-vault', 'advanced-analytics', 'data-export', 'goal-forecasting',
      'advanced-logging', 'private-groups', 'weekly-digest',
      'structured-programs', 'referral',
    ]) {
      expect(APP_FEATURES.find((f) => f.id === id)?.tier).toBe('fortress');
    }
  });

  it('does not promise automation for a coached service', () => {
    // Nutrition coaching moved tiers because a person delivers it. If the
    // copy still said "automatically", Valhalla would be charging a human
    // price for something described as running itself.
    const nutrition = APP_FEATURES.find((f) => f.id === 'nutrition-coaching');
    expect(nutrition?.tier).toBe('valhalla');
    expect(nutrition?.description).not.toMatch(/automatic/i);
  });

  it('pitches every tier, cheapest first', () => {
    expect(TIER_ORDER).toEqual(['free', 'fortress', 'valhalla']);
    for (const tier of TIER_ORDER) {
      expect(TIER_PITCH[tier].tier).toBe(tier);
      expect(TIER_PITCH[tier].tagline).toBeTruthy();
    }
    // Every feature must belong to a tier the Plans page actually draws, or
    // it would be paid for and invisible.
    for (const feature of APP_FEATURES) {
      expect(TIER_ORDER).toContain(feature.tier);
    }
  });

  it('prices every paid tier coherently, in every currency', () => {
    // This once asserted that no tier quoted a price at all, because billing
    // did not exist. Prices landed on 28 August and currencies on 1
    // September, so the rule keeps widening rather than disappearing: a tier
    // may carry a price, but every column has to make sense on its own.
    //
    // Checking all of them matters more than it looks. Currencies are the
    // sort of table where one cell gets edited and its annual twin does not,
    // and the only way that surfaces is a member in one market being offered
    // a "saving" that costs more.
    for (const currency of CURRENCIES) {
      for (const tier of TIER_ORDER) {
        const p = pricingFor(tier, currency.code);
        const where = `${currency.code} ${tier}`;

        expect(p.currency).toBe(currency.code);

        if (tier === 'free') {
          expect(p.monthly).toBe(0);
          continue;
        }

        // Either both are set or neither is. A monthly price with no annual
        // renders a billing toggle whose other side is blank.
        expect(`${where}: ${p.monthly}`).not.toContain('null');
        expect(`${where}: ${p.annualPerMonth}`).not.toContain('null');
        expect(p.monthly as number).toBeGreaterThan(0);

        // Paying for a year up front must never cost more per month than
        // paying monthly. This is the one way a pair can be actively wrong
        // rather than merely debatable.
        expect(p.annualPerMonth as number).toBeLessThan(p.monthly as number);

        // And the saving has to be worth a badge. Under about 10% reads as
        // an insult rather than an offer.
        const saving = annualSavingPct(p);
        expect(saving).not.toBeNull();
        expect(saving as number).toBeGreaterThanOrEqual(10);
      }

      // Valhalla costs somebody's hours and Fortress does not, so it is the
      // dearer of the two by a distance that reflects that -- in every
      // market, not just the one whose numbers were written first. Pinned
      // because a well-meaning local discount on the coached tier is how it
      // stops paying its coach.
      const fortress = pricingFor('fortress', currency.code).monthly as number;
      const valhalla = pricingFor('valhalla', currency.code).monthly as number;
      expect(valhalla).toBeGreaterThan(fortress * 5);
    }
  });

  it('offers a currency for every priced column, and no orphans', () => {
    // The picker iterates CURRENCIES and the table is keyed by the same
    // codes, so a currency added to one and not the other is either a pill
    // that crashes on selection or a price table nobody can reach.
    for (const currency of CURRENCIES) {
      expect(pricingFor('fortress', currency.code)).toBeTruthy();
    }
    expect(isCurrencyCode(DEFAULT_CURRENCY)).toBe(true);

    // An unknown code falls back rather than throwing: a stored preference
    // can outlive the currency it names, and a pricing page that crashes on
    // one is worse than one that shows dollars.
    expect(parseCurrency('XBT')).toBe(DEFAULT_CURRENCY);
    expect(parseCurrency(undefined)).toBe(DEFAULT_CURRENCY);
    expect(parseCurrency('ZAR')).toBe('ZAR');
  });

  it('formats an amount with its own symbol, never a hard-coded dollar', () => {
    // The bug this stops: the symbol was inlined in PlanPrice while USD was
    // the only option, which would have printed "$89.99" for a rand price
    // and looked entirely normal doing it.
    expect(formatPrice(4.99, 'USD')).toBe('$4.99');
    expect(formatPrice(89.99, 'ZAR')).toBe('R89.99');
    expect(formatPrice(4.49, 'GBP')).toBe('£4.49');
    expect(formatPrice(5.49, 'EUR')).toBe('€5.49');
    // Two decimals always, so a price point never reads as a rounded number
    // beside one that does not.
    expect(formatPrice(70, 'ZAR')).toBe('R70.00');
  });

  it('caps the tier a person has to deliver, and only that one', () => {
    // Valhalla's cost is someone's hours, so it has a ceiling the software
    // tiers never will. If that note ever disappears, the app is selling
    // unlimited access to a finite person.
    expect(TIER_PITCH.valhalla.note).toBeTruthy();
    expect(TIER_PITCH.free.note).toBeUndefined();
    expect(TIER_PITCH.fortress.note).toBeUndefined();
  });

  it('keeps the unfunded content promises out of the tier being sold', () => {
    // Both need a budget nobody has committed: filming 125 exercises, and
    // writing new guides every month. Fortress is the tier about to go on
    // sale, and a tier that advertises something with no date attached earns
    // refunds. Video moved up for that reason, not because it costs more to
    // serve -- it is filmed once and then served for nothing.
    expect(APP_FEATURES.find((f) => f.id === 'video-guides')?.tier).toBe('valhalla');
    expect(APP_FEATURES.find((f) => f.id === 'expert-guides')?.tier).toBe('valhalla');
  });
});
