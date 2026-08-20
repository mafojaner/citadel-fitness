import { APP_FEATURES } from '../../constants/featureCatalog';
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

  it('puts the human-delivered features in Valhalla', () => {
    // The split is marginal cost per member: form check, nutrition
    // coaching and priority support all have a person on the other end,
    // and early access costs nothing to give the top tier. Pinned so they
    // can't drift back down to a tier that couldn't afford to serve them.
    const valhallaIds = APP_FEATURES.filter((f) => f.tier === 'valhalla').map((f) => f.id).sort();
    expect(valhallaIds).toEqual([
      'early-access',
      'form-check',
      'nutrition-coaching',
      'priority-support',
    ]);
  });

  it('does not promise automation for a coached service', () => {
    // Nutrition coaching moved tiers because a person delivers it. If the
    // copy still said "automatically", Valhalla would be charging a human
    // price for something described as running itself.
    const nutrition = APP_FEATURES.find((f) => f.id === 'nutrition-coaching');
    expect(nutrition?.tier).toBe('valhalla');
    expect(nutrition?.description).not.toMatch(/automatic/i);
  });

  it('keeps content features in Fortress, where serving them costs nothing extra', () => {
    // Video and written guides are expensive to produce once and free to
    // serve, so promoting them would shrink the audience without saving
    // anything.
    for (const id of ['video-guides', 'expert-guides']) {
      expect(APP_FEATURES.find((f) => f.id === id)?.tier).toBe('fortress');
    }
  });
});
