"""Tileable felt (baize) texture, grey around 128, for background-blend-mode: overlay."""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
N = 512; rng = np.random.default_rng(7)
def periodic_noise(scale_lo, scale_hi):
    f = np.fft.fftfreq(N); fx, fy = np.meshgrid(f, f); r = np.hypot(fx, fy)
    band = ((r > 1/scale_hi) & (r < 1/scale_lo)).astype(float)
    spec = (rng.normal(size=(N, N)) + 1j*rng.normal(size=(N, N))) * band
    n = np.real(np.fft.ifft2(spec)); return (n - n.mean()) / n.std()
mottle = periodic_noise(60, 400)            # soft clouds of denser and thinner wool
grain = periodic_noise(1.5, 6)              # fine fuzz
img = 128 + 2.6*mottle + 7*grain
# fibres: short curved hairs, mostly lying one way (the nap), drawn with wrap-around
fib = Image.new("L", (N*3, N*3), 128); d = ImageDraw.Draw(fib)
for _ in range(26000):
    x, y = rng.uniform(0, N, 2); L = rng.uniform(4, 13)
    a = rng.normal(0.35, 0.6) if rng.random() < 0.55 else rng.uniform(0, np.pi)
    bend = rng.normal(0, 0.25); tone = 128 + (rng.choice([1, -1]) * rng.uniform(18, 40))
    pts = []
    for t in np.linspace(0, 1, 6):
        ang = a + bend*t; pts.append((x + np.cos(ang)*L*t, y + np.sin(ang)*L*t))
    for ox in (0, N, 2*N):
        for oy in (0, N, 2*N):
            d.line([(px+ox, py+oy) for px, py in pts], fill=int(tone), width=1)
fib = fib.filter(ImageFilter.GaussianBlur(0.35)).crop((N, N, 2*N, 2*N))
f = np.asarray(fib, float) - 128
img = img + 0.42*f
img = np.clip(img, 0, 255).astype(np.uint8)
out = Image.fromarray(img, "L")
import os; O = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out"); os.makedirs(O, exist_ok=True)
out.save(os.path.join(O, "baize.png")); out.save(os.path.join(O, "baize.webp"), quality=82, method=6)  # embedded in ../tex.json as "baize"
print(img.mean(), img.std())
