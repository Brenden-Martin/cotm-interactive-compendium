"""Calibrate the browser's Luckfield interestingness metric against Brenden's positive examples."""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image

W, H = 160, 90
FIXTURES = Path(__file__).parent / "fixtures" / "luckfield-interest"
CROPS = {
    "positive-01.jpg": (26, 270, 549, 942),
    "positive-02.jpg": (26, 319, 550, 994),
    "positive-03.jpg": (25, 309, 550, 984),
    "positive-04.jpg": (26, 245, 550, 918),
    "positive-05.jpg": (26, 182, 550, 855),
}


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def presence(value: float, low: float, high: float) -> float:
    position = clamp01((value-low)/(high-low))
    return position*position*(3-2*position)


def score(path: Path, crop: tuple[int, int, int, int]) -> dict[str, float]:
    image = Image.open(path).convert("RGB").crop(crop).resize((W, H), Image.Resampling.NEAREST)
    raster = image.load()
    pixels = [tuple(channel / 255 for channel in raster[x, y]) for y in range(H) for x in range(W)]
    histogram = [0] * 16
    brightness = 0.0
    color_variance = 0.0
    for red, green, blue in pixels:
        luminance = (red + green + blue) / 3
        brightness += luminance
        histogram[min(15, int(luminance * 16))] += 1
        color_variance += ((red-luminance)**2 + (green-luminance)**2 + (blue-luminance)**2) / 3
    entropy = -sum((count/(W*H))*math.log2(count/(W*H)) for count in histogram if count) / 4
    chroma = clamp01(math.sqrt(color_variance/(W*H))*2.8)
    scale_contrasts = []
    for distance in (1, 2, 4, 8, 16):
        energy = 0.0
        for y in range(H):
            for x in range(W):
                center = pixels[y*W+x]
                right = pixels[y*W+(x+distance)%W]
                down = pixels[((y+distance)%H)*W+x]
                energy += sum(abs(center[channel]-right[channel]) + abs(center[channel]-down[channel]) for channel in range(3)) / 6
        scale_contrasts.append(clamp01(energy/(W*H)*3.6))
    scale_mean = sum(scale_contrasts) / len(scale_contrasts)
    scale_floor = sorted(scale_contrasts)[1]
    scale_balance = clamp01(scale_floor/scale_mean) if scale_mean else 0
    multiscale = clamp01(scale_mean*.68 + scale_floor*.32)
    detail = clamp01(
        presence(entropy, .28, .78)*.25
        + presence(chroma, .12, .70)*.17
        + presence(multiscale, .16, .60)*.43
        + presence(scale_balance, .45, .90)*.15
    )
    return {
        "brightness": brightness/(W*H),
        "entropy": entropy,
        "color_variance": chroma,
        "multiscale": multiscale,
        "scale_balance": scale_balance,
        "detail": detail,
    }


results = {name: score(FIXTURES/name, crop) for name, crop in CROPS.items()}
details = [metrics["detail"] for metrics in results.values()]
print(json.dumps(results, indent=2))
print(f"detail floor={min(details):.3f} ceiling={max(details):.3f} spread={max(details)-min(details):.3f}")
if min(details) < 0.90:
    raise SystemExit("A positive exemplar fell below the high-interest floor of 0.90")
if max(details)-min(details) > 0.11:
    raise SystemExit("Positive exemplar detail scores are not relatively equal")
