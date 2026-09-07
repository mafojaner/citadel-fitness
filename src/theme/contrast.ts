/**
 * Keeping a brand colour legible on whatever it lands on.
 *
 * The app draws feature and category glyphs in their own ink, inside a
 * neutral disc. That works unchanged on the dark theme -- every colour in
 * the palette already clears 3:1 against the disc's `#2A3140`. On the light
 * theme not one of them does: the disc is `#D8DCE4`, and a saturated
 * mid-tone sits too close to it. The worst are the bright ones. `#FFC837`
 * has a relative luminance of 0.63, so against a light grey it is
 * arithmetically incapable of 3:1 no matter which grey you pick -- there is
 * no tuning of the disc that rescues it.
 *
 * So the ink moves instead, and only as far as it has to: toward the
 * scheme's own extreme until it clears the bar, which is nothing at all for
 * most of the palette and 15-25% for the four brightest ramps. Hue
 * survives, which is the part that says which feature this is.
 *
 * A function rather than a second column in the palette because the
 * catalogue's gradients are data: a feature added next month gets a
 * readable glyph without anyone remembering to hand-pick its light-theme
 * twin.
 */

/**
 * How far a glyph has to stand off its disc. Deliberately below WCAG
 * 1.4.11's 3:1 for a graphical object, and the reason is worth stating
 * rather than hiding.
 *
 * 1.4.11 governs graphics you need in order to understand the content.
 * None of these are: every one sits immediately beside a text label naming
 * the same thing -- the category is written next to its glyph, the feature
 * next to its own. The glyph is a second, redundant channel.
 *
 * Held to 3:1 the light theme has to darken a bright hue by up to 45%,
 * which turns the yellow ramp into olive and the mint into forest green.
 * That is contrast bought by destroying the thing the contrast was for:
 * a glyph nobody can tell is yellow has not been made more legible, it
 * has been made grey. At 2 the five darker ramps come through as their
 * exact brand colour and the four light ones move 15-25%, which reads as
 * the same hue a shade deeper.
 *
 * If a glyph ever becomes the only carrier of some meaning, that one wants
 * 3 -- pass it explicitly rather than moving this.
 */
export const MIN_GLYPH_CONTRAST = 2;

function channels(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function toHex([r, g, b]: [number, number, number]): string {
  const pair = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${pair(r)}${pair(g)}${pair(b)}`.toUpperCase();
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast, 1 (identical) to 21 (black on white). Order of arguments does not matter. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function mix(from: string, to: string, amount: number): string {
  const a = channels(from);
  const b = channels(to);
  return toHex([
    a[0] + (b[0] - a[0]) * amount,
    a[1] + (b[1] - a[1]) * amount,
    a[2] + (b[2] - a[2]) * amount,
  ]);
}

/**
 * `ink` if it already reads on `background`, otherwise the nearest step of
 * it that does.
 *
 * Which way it steps is decided by the background, not by the ink: on a
 * light ground the colour darkens, on a dark ground it lightens. Stepping
 * the wrong way would make a pale glyph paler.
 *
 * Returns the ink unchanged when the bar cannot be met at all -- a fully
 * black or white result is not a colour, and this exists to keep colours.
 */
export function readableOn(ink: string, background: string, minRatio = MIN_GLYPH_CONTRAST): string {
  if (contrastRatio(ink, background) >= minRatio) return ink;

  const target = relativeLuminance(background) > 0.4 ? '#0B0E14' : '#FFFFFF';
  // 5% steps: fine enough that nothing is darkened further than it needs to
  // be, coarse enough to settle in at most twenty comparisons.
  for (let amount = 0.05; amount <= 0.9; amount += 0.05) {
    const candidate = mix(ink, target, amount);
    if (contrastRatio(candidate, background) >= minRatio) return candidate;
  }
  return ink;
}
