import { APP_FEATURES, TIER_ORDER, TIER_PITCH } from '../../constants/featureCatalog';
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

  it('quotes no price while there is no way to charge one', () => {
    // Billing isn't built. A number on the Plans page before then is a
    // promise the app cannot keep, and the kind of copy that gets pasted in
    // "just as a placeholder" and then ships.
    for (const tier of TIER_ORDER) {
      expect(TIER_PITCH[tier].price).not.toMatch(/[0-9]|\$|£|€|R\s?\d/);
    }
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
