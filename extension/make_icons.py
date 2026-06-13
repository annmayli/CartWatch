"""Generates PNG icons for the extension. Run once: `python3 make_icons.py`."""
from PIL import Image, ImageDraw
from pathlib import Path

BRAND = (104, 69, 255)
WHITE = (255, 255, 255)


def heart(draw, size, color):
    # Draw a stylized heart inside an `size`x`size` box.
    pad = size * 0.18
    w = size - 2 * pad
    h = size - 2 * pad
    cx, cy = size / 2, size / 2 + pad * 0.1
    r = w / 4
    # Two top circles
    draw.ellipse([cx - r * 2, cy - r * 1.3, cx, cy + r * 0.2], fill=color)
    draw.ellipse([cx, cy - r * 1.3, cx + r * 2, cy + r * 0.2], fill=color)
    # Bottom triangle
    draw.polygon(
        [
            (cx - r * 2, cy - r * 0.2),
            (cx + r * 2, cy - r * 0.2),
            (cx, cy + r * 2.0),
        ],
        fill=color,
    )


def make(size, out):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    radius = max(2, size // 5)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BRAND)
    heart(d, size, WHITE)
    img.save(out)


here = Path(__file__).parent / "icons"
here.mkdir(exist_ok=True)
for s in (16, 32, 48, 128):
    make(s, here / f"icon{s}.png")
print("wrote", *(f"icons/icon{s}.png" for s in (16, 32, 48, 128)))
