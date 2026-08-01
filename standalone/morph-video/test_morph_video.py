from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import imageio_ffmpeg
import numpy as np

from morph_video import (
    COLOR_IDENTITIES,
    Config,
    RenderOptions,
    initialize_field,
    load_presets,
    permute_config_channels,
    render_video,
    step_boundary_field,
)


class MorphMathTests(unittest.TestCase):
    def test_six_color_identities_are_unique_and_invertible(self):
        config = Config(np.arange(45, dtype=np.float32).reshape(3, 3, 5), np.asarray([2, 3, 5], dtype=np.float32), .2, .1, 0)
        fingerprints = set()
        for permutation in COLOR_IDENTITIES.values():
            transformed = permute_config_channels(config, permutation)
            fingerprints.add(transformed.k.tobytes() + transformed.exponent.tobytes())
            inverse = tuple(permutation.index(channel) for channel in range(3))
            restored = permute_config_channels(transformed, inverse)
            np.testing.assert_array_equal(restored.k, config.k)
            np.testing.assert_array_equal(restored.exponent, config.exponent)
        self.assertEqual(len(fingerprints), 6)

    def test_bundled_bank_contains_the_live_snapshot(self):
        presets = load_presets()
        self.assertGreaterEqual(len(presets), 200)

    def test_boundary_step_is_finite_and_bounded(self):
        rng = np.random.default_rng(7)
        field = initialize_field(12, 18, rng)
        weights = rng.random((3, 12, 18), dtype=np.float32)
        config = load_presets()[0].config
        result = step_boundary_field(field, weights, config, rng)
        self.assertEqual(result.shape, (3, 12, 18))
        self.assertTrue(np.all(np.isfinite(result)))
        self.assertGreaterEqual(float(result.min()), 0)
        self.assertLessEqual(float(result.max()), 1)


class TinyVideoRenderTest(unittest.TestCase):
    def test_end_to_end_video_render(self):
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary)
            source = folder / "input.mp4"
            output = folder / "output.mp4"
            writer = imageio_ffmpeg.write_frames(
                str(source), (32, 18), fps=6, codec="libx264", pix_fmt_in="rgb24", pix_fmt_out="yuv420p", macro_block_size=2
            )
            writer.send(None)
            for index in range(6):
                frame = np.zeros((18, 32, 3), dtype=np.uint8)
                frame[:, :, index % 3] = 80 + index * 25
                writer.send(frame.tobytes())
            writer.close()

            result = render_video(
                source,
                output,
                RenderOptions(mode="morph", scale=.5, seed=11, preserve_audio=False),
            )
            self.assertEqual(result.frames, 6)
            self.assertEqual((result.width, result.height), (16, 8))
            self.assertTrue(output.is_file())
            self.assertGreater(output.stat().st_size, 0)


if __name__ == "__main__":
    unittest.main()
