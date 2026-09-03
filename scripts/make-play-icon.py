"""Generate the Play Store listing icon (512x512) from the app icon.

Run:  python scripts/make-play-icon.py

Play's store listing icon is a fixed 512x512 PNG, separate from the icon that
ships inside the app -- `assets/icon.png` is 1024x1024, which the launcher
wants and the listing field rejects. Uploading the wrong one is a form error
rather than anything subtle, but it stops you mid-submission, which is worse
when the whole point of the sitting is to get through the forms.

Written out as RGBA. Play has asked for a "32-bit PNG" at various points and
the source is RGB with no alpha channel; adding an opaque one costs a few
kilobytes and removes a question.

Downscaled with LANCZOS from the 1024 master rather than re-rendered, so the
listing icon and the launcher icon cannot drift apart. There is no separate
artwork here to maintain.
"""

import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'icon.png')
OUT = os.path.join(ROOT, 'assets', 'play-store-icon.png')

SIZE = 512
MAX_BYTES = 1024 * 1024


def main():
    icon = Image.open(SRC)
    if icon.size != (1024, 1024):
        print('note: source is %dx%d, expected 1024x1024' % icon.size)

    out = icon.convert('RGBA').resize((SIZE, SIZE), Image.LANCZOS)
    out.save(OUT, 'PNG')

    size = os.path.getsize(OUT)
    print('wrote %s (%dx%d, %s, %.0f KB)' % (OUT, out.width, out.height, out.mode, size / 1024))
    if size > MAX_BYTES:
        raise SystemExit('too large for Play: %d bytes, limit %d' % (size, MAX_BYTES))


if __name__ == '__main__':
    main()
