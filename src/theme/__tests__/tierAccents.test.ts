import { darkColors, lightColors, tierAccents } from '../tokens';

const SCHEMES = ['light', 'dark'] as const;

function surfacesFor(scheme: (typeof SCHEMES)[number]) {
  const colors = scheme === 'dark' ? darkColors : lightColors;
  return [colors.background, colors.surface];
}

/** Relative luminance, 0 (black) to 1 (white), from a #RRGGBB string. */
function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('tier accents', () => {
  it('keeps Fortress white and Valhalla black in both schemes', () => {
    // The whole point of the pair: they are the two ends of the palette, so
    // the ladder reads at a glance. Flipping either one per scheme would
    // make "Fortress is the white one" false half the time.
    for (const scheme of SCHEMES) {
      const tiers = tierAccents(scheme);
      expect(tiers.fortress.accent.toUpperCase()).toBe('#FFFFFF');
      expect(luminance(tiers.valhalla.accent)).toBeLessThan(0.02);
    }
  });

  it('leaves the free tier unbranded', () => {
    // Free deliberately has no signature colour — giving the tier nobody
    // pays for one would put it on the same footing as the two that cost
    // money. Concretely: it must not borrow either paid tier's colour, or
    // the ladder stops being readable as a ladder.
    for (const scheme of SCHEMES) {
      const tiers = tierAccents(scheme);
      expect(tiers.free.accent).not.toBe(tiers.fortress.accent);
      expect(tiers.free.accent).not.toBe(tiers.valhalla.accent);
    }
  });

  it('draws readable text on every accent', () => {
    // 4.5:1 is the WCAG AA floor for body text, and the tier name sits
    // directly on the accent fill.
    for (const scheme of SCHEMES) {
      for (const [tier, accent] of Object.entries(tierAccents(scheme))) {
        expect(`${scheme}/${tier}: ${contrast(accent.accent, accent.onAccent).toFixed(2)}`).toBe(
          `${scheme}/${tier}: ${Math.max(contrast(accent.accent, accent.onAccent), 4.5).toFixed(2)}`,
        );
      }
    }
  });

  it('gives every accent a border that separates it from the page', () => {
    // The failure this exists to catch: a white Fortress card on a white
    // surface, or a black Valhalla card on a near-black one, rendering as
    // an invisible rectangle. Whenever the fill is close to what sits
    // behind it, the outline has to do the work instead.
    for (const scheme of SCHEMES) {
      for (const [tier, accent] of Object.entries(tierAccents(scheme))) {
        for (const behind of surfacesFor(scheme)) {
          if (contrast(accent.accent, behind) >= 1.2) continue;
          expect(`${scheme}/${tier} on ${behind}: ${contrast(accent.border, behind) >= 1.5}`).toBe(
            `${scheme}/${tier} on ${behind}: true`,
          );
        }
      }
    }
  });
});
