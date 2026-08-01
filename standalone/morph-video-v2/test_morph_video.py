from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
import subprocess

import imageio_ffmpeg
import numpy as np

from morph_video import (
    COLOR_IDENTITIES,
    Config,
    RenderOptions,
    initialize_field,
    load_presets,
    permute_config_channels,
    preprocess_boundary,
    render_video,
    step_boundary_field,
    upscale_nearest,
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

    def test_gray_quantization_and_white_bias(self):
        image = np.asarray(
            [[[0, 0, 0], [.2, .4, .6], [.8, .5, .1], [1, 1, 1]]],
            dtype=np.float32,
        )
        options = RenderOptions(quantize_levels=4, white_bias=.1, brightness=1.0, saturation=1.5)
        adjusted = preprocess_boundary(image, options)
        np.testing.assert_allclose(adjusted[:, :, 0], adjusted[:, :, 1])
        np.testing.assert_allclose(adjusted[:, :, 1], adjusted[:, :, 2])
        self.assertLessEqual(len(np.unique(adjusted)), 4)
        self.assertGreaterEqual(float(adjusted.min()), .1)

        binary = preprocess_boundary(image, RenderOptions(quantize_levels=2))
        self.assertTrue(set(np.unique(binary)).issubset({0.0, 1.0}))

    def test_continuous_contrast_is_skipped_when_quantized(self):
        image = np.full((2, 2, 3), .25, dtype=np.float32)
        continuous = preprocess_boundary(image, RenderOptions(contrast=2.0))
        quantized_low = preprocess_boundary(image, RenderOptions(quantize_levels=4, contrast=0.0))
        quantized_high = preprocess_boundary(image, RenderOptions(quantize_levels=4, contrast=4.0))
        self.assertAlmostEqual(float(continuous[0, 0, 0]), 0.0)
        np.testing.assert_array_equal(quantized_low, quantized_high)

    def test_nearest_upscale_introduces_no_interpolated_pixels(self):
        frame = np.asarray(
            [
                [[255, 0, 0], [0, 255, 0], [0, 0, 255]],
                [[255, 255, 0], [0, 255, 255], [255, 0, 255]],
            ],
            dtype=np.uint8,
        )
        doubled = upscale_nearest(frame, 6, 4)
        expected = np.repeat(np.repeat(frame, 2, axis=0), 2, axis=1)
        np.testing.assert_array_equal(doubled, expected)

        uneven = upscale_nearest(frame, 8, 5)
        source_colors = {tuple(color) for color in frame.reshape(-1, 3)}
        output_colors = {tuple(color) for color in uneven.reshape(-1, 3)}
        self.assertTrue(output_colors.issubset(source_colors))


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
                RenderOptions(
                    mode="morph",
                    scale=.5,
                    seed=11,
                    preserve_audio=False,
                    loops=2,
                    frame_hold=3,
                    quantize_levels=3,
                    white_bias=.05,
                ),
            )
            self.assertEqual(result.frames, 36)
            self.assertEqual((result.width, result.height), (32, 18))
            self.assertEqual((result.simulation_width, result.simulation_height), (16, 8))
            self.assertTrue(output.is_file())
            self.assertGreater(output.stat().st_size, 0)
            reader = imageio_ffmpeg.read_frames(str(output), pix_fmt="rgb24")
            metadata = next(reader)
            reader.close()
            self.assertEqual(tuple(metadata["size"]), (32, 18))

    def test_looped_and_held_video_keeps_time_stretched_audio(self):
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary)
            source = folder / "input-with-audio.mp4"
            output = folder / "output-with-audio.mp4"
            command = [
                imageio_ffmpeg.get_ffmpeg_exe(), "-nostdin", "-y", "-loglevel", "error",
                "-f", "lavfi", "-i", "testsrc=size=32x18:rate=6:duration=1",
                "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(source),
            ]
            subprocess.run(command, check=True)

            result = render_video(
                source,
                output,
                RenderOptions(mode="preset", preset="Nova", scale=.5, seed=9, loops=2, frame_hold=2, preserve_audio=True),
            )
            self.assertEqual(result.frames, 24)
            self.assertTrue(result.audio_preserved)
            self.assertIsNone(result.warning)
            reader = imageio_ffmpeg.read_frames(str(output), pix_fmt="rgb24")
            metadata = next(reader)
            reader.close()
            self.assertAlmostEqual(float(metadata["duration"]), 4.0, delta=.2)


if __name__ == "__main__":
    unittest.main()
