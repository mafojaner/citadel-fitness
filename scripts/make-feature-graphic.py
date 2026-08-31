"""Generate the Play Store feature graphic (1024x500) from the app icon.

Run:  python scripts/make-feature-graphic.py

Deliberately no typography. Two reasons, and both are worth knowing before
someone "improves" this by adding the app name:

1. Play overlays the app title over this image in several placements, so a
   name baked into the artwork ends up printed twice.
2. There is no openly-licensed typeface on this machine. Rasterising Arial
   or Segoe UI into an asset that ships on a store listing is a licensing
   question nobody needs, and it would be invisible in the committed PNG.

If you do want text on it, add it with a font you have a licence for and
regenerate rather than editing the PNG by hand -- the point of this being a
script is that the asset can be rebuilt from the mark at any size.
"""

import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICON = os.path.join(ROOT, 'assets', 'icon.png')
OUT = os.path.join(ROOT, 'assets', 'play-feature-graphic.png')

W, H = 1024, 500

# The icon's own background, sampled rather than guessed, so the graphic and
# the icon sit on the same ground when Play shows them together.
INK = (11, 14, 20)
EMBER = (255, 90, 54)

# The mark's bounding box inside icon.png, measured by scanning for light
# pixels. Hard-coded rather than re-scanned on every run so the output is
# deterministic; re-measure if the icon is ever replaced.
MARK_BOX = (232, 256, 794, 780)


def build() -> Image.Image:
    canvas = Image.new('RGB', (W, H), INK)

    # A very slight vertical lift, so the mark is not floating on a flat
    # field. Kept far below the point where it reads as a gradient -- this
    # should look like unlit space, not like a background effect.
    draw = ImageDraw.Draw(canvas)
    for y in range(H):
        t = y / H
        shade = tuple(int(c + (18 - c * 0.15) * (t ** 2.2)) for c in INK)
        draw.line([(0, y), (W, y)], fill=shade)

    mark = Image.open(ICON).convert('RGBA').crop(MARK_BOX)

    # Scaled by height. 300px on a 500px canvas leaves 100px of clear space
    # top and bottom, which is inside Play's crop on every surface it uses.
    target_h = 300
    scale = target_h / mark.height
    mark = mark.resize((round(mark.width * scale), target_h), Image.LANCZOS)

    # The mark is white-on-ink with no alpha, so luminance becomes the mask.
    # It has to be levelled first: the icon's "black" is (11, 14, 20), which
    # is luminance ~13, not 0. Using it raw paints about 5% white across the
    # whole crop and the mark arrives inside a visible grey rectangle --
    # which is exactly what the first render of this did.
    #
    # Levelled rather than thresholded, so the engraved shading inside the
    # castle survives instead of flattening to a silhouette.
    FLOOR = 26  # comfortably above the ink's own luminance
    mask = mark.convert('L').point(
        lambda v: 0 if v <= FLOOR else min(255, round((v - FLOOR) * 255 / (255 - FLOOR)))
    )
    white = Image.new('RGB', mark.size, (255, 255, 255))

    x = (W - mark.width) // 2
    y = (H - target_h) // 2 - 12
    canvas.paste(white, (x, y), mask)

    # One ember rule under the mark, the width of the mark itself. It echoes
    # the ground line the castle already stands on in the icon, which is why
    # it reads as part of the drawing rather than as a divider dropped on top.
    # Close to the mark's own base bar rather than floating below it. At a
    # 30px gap the two read as parallel lines and the ember looks like a
    # divider someone dropped in; at 14 it reads as the mark being
    # underlined, which is what it is for.
    rule_y = y + target_h + 14
    rule_w = round(mark.width * 0.45)
    draw.rounded_rectangle(
        [(W - rule_w) // 2, rule_y, (W + rule_w) // 2, rule_y + 5],
        radius=3,
        fill=EMBER,
    )
    return canvas


if __name__ == '__main__':
    img = build()
    assert img.size == (W, H), 'Play requires exactly 1024x500'
    img.save(OUT, 'PNG', optimize=True)
    print('wrote', OUT, img.size, os.path.getsize(OUT), 'bytes')
