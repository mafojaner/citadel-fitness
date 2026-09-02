"""Generate the stacked wordmark (500x500) from the castle mark and Montserrat.

Run:  python scripts/make-wordmark.py

The asset used to read "CITADEL SOCIETY" while app.json, the bundle
identifiers, the store listing, the privacy policy and the app's own copy all
said "Citadel Fitness". Both stores check the listing name against the name in
the app, and a wordmark carrying a third one comes back as a rejection with a
vague reason attached.

Unlike make-feature-graphic.py, this one does set type, so the licensing
question that script avoided had to be answered rather than sidestepped:
assets/fonts is Montserrat under the SIL Open Font License 1.1, which permits
commercial use and embedding. OFL.txt sits beside it. Do not swap in a system
font -- rasterising Arial or Segoe UI into a store asset is the exact question
this avoids.

Montserrat was not guessed at. Rendering "CITADEL" across every weight, size
and tracking combination and scoring pixel overlap against the original put
Black at 31px with 2px tracking at 0.914 IoU, and "SOCIETY" at 21px with the
same tracking at 0.894. It reads as ExtraBold by eye; it is Black. Anything
that changes the face should be checked the same way rather than by looking.

Both lines are redrawn rather than only the second. Keeping the original
raster for the top line and setting the bottom one fresh would leave two lines
from two sources, and a viewer notices the difference *between* the lines long
before any difference from an old file nobody has to hand.
"""

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CASTLE = os.path.join(ROOT, 'assets', 'logo-castle.png')
FONT = os.path.join(ROOT, 'assets', 'fonts', 'Montserrat[wght].ttf')
OUT = os.path.join(ROOT, 'assets', 'logo-wordmark.png')

WEIGHT = 'Black'
TRACKING = 2.0

# Cap-top y and pixel height measured off the original, so the new type sits
# exactly where the old type sat relative to the castle.
LINES = [
    {'text': 'CITADEL', 'size': 31, 'top': 311},
    {'text': 'FITNESS', 'size': 21, 'top': 340},
]

CENTRE_X = 250


def render_line(text, size):
    """Draw one line letter by letter, so tracking is applied between glyphs.

    Pillow has no letter-spacing, and the original is tracked -- setting the
    string in one call would come out too tight and no scaling would fix it,
    because the error is in the gaps rather than the glyphs.
    """
    font = ImageFont.truetype(FONT, size)
    font.set_variation_by_name(WEIGHT)

    scratch = Image.new('L', (900, 300), 0)
    draw = ImageDraw.Draw(scratch)
    x = 100.0
    for ch in text:
        draw.text((x, 100), ch, font=font, fill=255)
        x += draw.textlength(ch, font=font) + TRACKING

    # Trim to ink. Positioning off the drawn bounding box rather than off the
    # font's own metrics keeps the cap-top where it was measured, regardless
    # of the ascent Montserrat happens to report.
    box = scratch.getbbox()
    return scratch.crop(box)


def main():
    base = Image.open(CASTLE).convert('RGB')

    for line in LINES:
        ink = render_line(line['text'], line['size'])
        x = CENTRE_X - ink.width // 2
        # White type, pasted through the glyph mask so the near-black ground
        # underneath is left alone rather than flattened to a grey block.
        base.paste((255, 255, 255), (x, line['top']), ink)

    base.save(OUT)
    print('wrote %s (%dx%d)' % (OUT, base.width, base.height))


if __name__ == '__main__':
    main()
