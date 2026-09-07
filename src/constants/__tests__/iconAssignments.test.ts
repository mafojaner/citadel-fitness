import { APP_FEATURES } from '../featureCatalog';
import {
  ARTICLE_CATEGORY_ICONS,
  ARTICLE_CATEGORY_INK,
  articleCategoryInk,
} from '../articles';
import {
  CATEGORY_FILTERS,
  CATEGORY_ICONS,
  CATEGORY_INK,
  DEFAULT_CATEGORY_ICON,
  DEFAULT_CATEGORY_INK,
} from '../categories';
import { MIN_GLYPH_CONTRAST, contrastRatio, readableOn } from '../../theme/contrast';
import { iconInk } from '../../theme/tokens';
import type { Category } from '../../types/models';

const PALETTE = Object.values(iconInk) as string[];
/** `colors.border` per scheme -- the disc every glyph sits in. */
const DISCS = { light: '#D8DCE4', dark: '#2A3140' };

const CATEGORIES = CATEGORY_FILTERS.filter((c) => c.value !== 'all').map(
  (c) => c.value as Category
);

describe('category icons', () => {
  it('covers every category the filter bar offers', () => {
    for (const category of CATEGORIES) {
      expect(`${category}:${Boolean(CATEGORY_ICONS[category])}`).toBe(`${category}:true`);
      expect(`${category}:${Boolean(CATEGORY_INK[category])}`).toBe(`${category}:true`);
    }
  });

  it('gives no two categories the same glyph', () => {
    // Chest and shoulders were both `barbell-outline`, so two tiles in the
    // Home grid were the same picture in different colours. A glyph that
    // does not distinguish is a glyph doing nothing.
    const glyphs = CATEGORIES.map((c) => CATEGORY_ICONS[c]);
    expect(glyphs.length).toBe(new Set(glyphs).size);
  });

  it('does not reach for another domain’s vocabulary', () => {
    // `sync` is the reload arrows and `contract` is collapse-inward; both
    // were sitting on muscle groups. Neither is a weak metaphor -- they are
    // other software's words.
    const borrowed = ['sync-outline', 'contract-outline', 'refresh-outline', 'settings-outline'];
    for (const category of CATEGORIES) {
      expect(`${category}:${borrowed.includes(CATEGORY_ICONS[category] ?? '')}`).toBe(
        `${category}:false`
      );
    }
  });
});

describe('ink assignments', () => {
  it('draws every category ink from the palette', () => {
    for (const category of CATEGORIES) {
      const ink = CATEGORY_INK[category] as string;
      expect(`${category}:${PALETTE.includes(ink)}`).toBe(`${category}:true`);
    }
    expect(PALETTE).toContain(DEFAULT_CATEGORY_INK);
  });

  it('draws every feature ink from the palette', () => {
    for (const feature of APP_FEATURES) {
      expect(`${feature.id}:${PALETTE.includes(feature.ink)}`).toBe(`${feature.id}:true`);
    }
  });

  it('draws every article ink from the palette', () => {
    for (const [category, ink] of Object.entries(ARTICLE_CATEGORY_INK)) {
      expect(`${category}:${PALETTE.includes(ink)}`).toBe(`${category}:true`);
    }
    for (const category of Object.keys(ARTICLE_CATEGORY_ICONS)) {
      expect(articleCategoryInk(category as never)).toBeTruthy();
    }
  });

  it('keeps every palette ink legible on both discs', () => {
    // The palette is what IconWell is handed, so this is the set that has to
    // survive readableOn rather than `gradients`, which no glyph reads now.
    for (const [name, ink] of Object.entries(iconInk)) {
      for (const [scheme, disc] of Object.entries(DISCS)) {
        const out = readableOn(ink, disc);
        expect(`${name}/${scheme}:${contrastRatio(out, disc) >= MIN_GLYPH_CONTRAST}`).toBe(
          `${name}/${scheme}:true`
        );
      }
    }
  });
});

describe('the same subject is the same colour on every tier', () => {
  /**
   * The point of the whole exercise. These pairs each name one idea that a
   * member can reach from a free surface and a paid one; if a pair ever
   * splits, the app is back to teaching that colour means tier.
   */
  const SAME_IDEA: [string, string, string][] = [
    ['training', 'workout-logging', 'structured-programs'],
    ['earned', 'streaks-charts', 'pr-vault'],
    ['earned', 'pr-vault', 'goal-forecasting'],
    ['other people', 'leaderboards', 'private-groups'],
    ['numbers', 'advanced-analytics', 'data-export'],
    ['coaching', 'form-check', 'ai-progressive-overload'],
    ['plumbing', 'offline-sync', 'wearable-sync'],
  ];

  it.each(SAME_IDEA)('%s: %s and %s share an ink', (_idea, a, b) => {
    const featureA = APP_FEATURES.find((f) => f.id === a);
    const featureB = APP_FEATURES.find((f) => f.id === b);
    expect(featureA).toBeDefined();
    expect(featureB).toBeDefined();
    expect(featureA?.ink).toBe(featureB?.ink);
  });

  it('spans tiers, or it is not proving anything', () => {
    // A guard on the guard: if every pair above happened to sit inside one
    // tier, the suite would pass while saying nothing about tiers at all.
    const crossesTiers = SAME_IDEA.some(([, a, b]) => {
      const ta = APP_FEATURES.find((f) => f.id === a)?.tier;
      const tb = APP_FEATURES.find((f) => f.id === b)?.tier;
      return ta !== tb;
    });
    expect(crossesTiers).toBe(true);
  });
});

describe('defaults', () => {
  it('has a fallback glyph and ink for a category with no entry', () => {
    expect(DEFAULT_CATEGORY_ICON).toBeTruthy();
    expect(DEFAULT_CATEGORY_INK).toBeTruthy();
  });
});
