import { APP_FEATURES } from '../../constants/featureCatalog';
import { TIER_LABELS, parseTier, tierAllows, tierRank } from '../membership';

describe('tierRank', () => {
  it('orders free below fortress below keep', () => {
    expect(tierRank('free')).toBeLessThan(tierRank('fortress'));
    expect(tierRank('fortress')).toBeLessThan(tierRank('keep'));
  });
});

describe('tierAllows', () => {
  it('grants everything at or below your tier', () => {
    expect(tierAllows('keep', 'keep')).toBe(true);
    expect(tierAllows('keep', 'fortress')).toBe(true);
    expect(tierAllows('keep', 'free')).toBe(true);
    expect(tierAllows('fortress', 'fortress')).toBe(true);
    expect(tierAllows('fortress', 'free')).toBe(true);
    expect(tierAllows('free', 'free')).toBe(true);
  });

  it('refuses anything above your tier', () => {
    expect(tierAllows('free', 'fortress')).toBe(false);
    expect(tierAllows('free', 'keep')).toBe(false);
    expect(tierAllows('fortress', 'keep')).toBe(false);
  });

  it('gives Keep members the Fortress features', () => {
    // The bug an equality check would introduce, and the one that would
    // only ever affect the members paying the most.
    const fortressFeatures = APP_FEATURES.filter((f) => f.tier === 'fortress');
    expect(fortressFeatures.length).toBeGreaterThan(0);
    for (const feature of fortressFeatures) {
      expect(tierAllows('keep', feature.tier)).toBe(true);
    }
  });

  it('does not give Fortress members the Keep features', () => {
    const keepFeatures = APP_FEATURES.filter((f) => f.tier === 'keep');
    expect(keepFeatures.length).toBeGreaterThan(0);
    for (const feature of keepFeatures) {
      expect(tierAllows('fortress', feature.tier)).toBe(false);
    }
  });
});

describe('parseTier', () => {
  it('accepts the known tiers', () => {
    expect(parseTier('free')).toBe('free');
    expect(parseTier('fortress')).toBe('fortress');
    expect(parseTier('keep')).toBe('keep');
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

  it('puts the human-delivered features in Keep', () => {
    // The split is marginal cost per member. These three are the ones
    // where a person is on the other end, or which cost nothing to give
    // the top tier — so they must not drift back down.
    const keepIds = APP_FEATURES.filter((f) => f.tier === 'keep').map((f) => f.id).sort();
    expect(keepIds).toEqual(['early-access', 'form-check', 'priority-support']);
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
