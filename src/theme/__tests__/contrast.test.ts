import {
  MIN_GLYPH_CONTRAST,
  contrastRatio,
  readableOn,
  relativeLuminance,
} from '../contrast';
import { gradients } from '../tokens';

/** The disc a glyph sits in, per scheme: `colors.border` from tokens. */
const LIGHT_DISC = '#D8DCE4';
const DARK_DISC = '#2A3140';

describe('relativeLuminance', () => {
  it('anchors at the two extremes', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('reads shorthand hex the same as longhand', () => {
    expect(relativeLuminance('#FFF')).toBeCloseTo(relativeLuminance('#FFFFFF'), 5);
  });

  it('weights green above red above blue, which is what makes yellow bright', () => {
    // The reason a yellow glyph cannot pass on a light disc: it is mostly
    // green and red, and those carry almost all of the luminance.
    expect(relativeLuminance('#00FF00')).toBeGreaterThan(relativeLuminance('#FF0000'));
    expect(relativeLuminance('#FF0000')).toBeGreaterThan(relativeLuminance('#0000FF'));
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for a colour on itself', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
    expect(contrastRatio('#FF5A36', '#FF5A36')).toBeCloseTo(1, 5);
  });

  it('does not care which argument is the background', () => {
    expect(contrastRatio('#FF5A36', LIGHT_DISC)).toBeCloseTo(
      contrastRatio(LIGHT_DISC, '#FF5A36'),
      5
    );
  });
});

describe('readableOn', () => {
  it('returns an ink untouched when it already clears the bar', () => {
    // The no-op case, which is most of the dark theme: the glyph is the
    // brand colour itself, not an approximation of it.
    const cyan = '#22D3EE';
    expect(contrastRatio(cyan, DARK_DISC)).toBeGreaterThan(MIN_GLYPH_CONTRAST);
    expect(readableOn(cyan, DARK_DISC)).toBe(cyan);
  });

  it('brings every palette ink up to the bar on the dark disc too', () => {
    // Not a formality: rankBronze ends at #A15C2E, which is dark enough to
    // fail against the dark disc, so this direction has real work to do.
    for (const [name, ramp] of Object.entries(gradients)) {
      const ink = ramp[ramp.length - 1];
      const out = readableOn(ink, DARK_DISC);
      expect(`${name}:${contrastRatio(out, DARK_DISC) >= MIN_GLYPH_CONTRAST}`).toBe(`${name}:true`);
    }
  });

  it('brings every palette ink up to the bar on the light disc', () => {
    for (const [name, ramp] of Object.entries(gradients)) {
      const ink = ramp[ramp.length - 1];
      const out = readableOn(ink, LIGHT_DISC);
      expect(`${name}:${contrastRatio(out, LIGHT_DISC) >= MIN_GLYPH_CONTRAST}`).toBe(`${name}:true`);
    }
  });

  it('darkens on a light ground and lightens on a dark one', () => {
    // The direction is the part that has to be read off the background: step
    // the wrong way and a pale glyph gets paler.
    const pale = '#FFC837';
    expect(relativeLuminance(readableOn(pale, LIGHT_DISC))).toBeLessThan(
      relativeLuminance(pale)
    );

    const deep = '#3A2E00';
    expect(relativeLuminance(readableOn(deep, '#0B0E14'))).toBeGreaterThan(
      relativeLuminance(deep)
    );
  });

  it('moves no further than it has to', () => {
    // A colour one step short should end up near the bar, not at the far
    // end of the ramp -- the difference between "adjusted" and "replaced".
    const adjusted = readableOn('#E24C4C', LIGHT_DISC);
    expect(contrastRatio(adjusted, LIGHT_DISC)).toBeLessThan(MIN_GLYPH_CONTRAST + 1);
  });

  it('keeps the hue recognisable rather than collapsing to black', () => {
    // Mint is the worst case in the palette: 1.40 on the light disc, so it
    // travels furthest. It still has to come out green.
    const mint = readableOn('#34D399', LIGHT_DISC);
    const [r, g, b] = [
      parseInt(mint.slice(1, 3), 16),
      parseInt(mint.slice(3, 5), 16),
      parseInt(mint.slice(5, 7), 16),
    ];
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
  });

  it('returns the ink unchanged when the bar is unreachable', () => {
    // Nothing clears 3:1 against a mid grey in both directions, and a glyph
    // is better off its own colour than silently turned to soot.
    expect(readableOn('#808080', '#808080', 21)).toBe('#808080');
  });
});
