"""Version 2 of the offline COTM video-boundary morph renderer.

The input video's RGB frames become spatial operator weights. The generated
three-channel field is the output; the source image is not simply overlaid.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import tempfile
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable, Sequence

import imageio_ffmpeg
import numpy as np
from PIL import Image


BASE_MORPH_SECONDS = 6.5
TEMPLATE_COUNT = 5
DEFAULT_BANK_PATH = Path(__file__).with_name("preset-bank.json")


@dataclass
class Config:
    """One DEQ configuration, stored as destination × source × operator."""

    k: np.ndarray
    exponent: np.ndarray
    dt: float
    decay: float
    noise: float

    @classmethod
    def from_payload(cls, payload: dict) -> "Config":
        k = np.asarray(payload["k"], dtype=np.float32)
        exponent = np.asarray(payload["exponent"], dtype=np.float32)
        if k.size != 45 or exponent.size != 3:
            raise ValueError("Preset must contain 45 coupling values and 3 exponents")
        scalars = (float(payload["dt"]), float(payload["decay"]), float(payload["noise"]))
        if not np.all(np.isfinite(k)) or not np.all(np.isfinite(exponent)) or not all(math.isfinite(v) for v in scalars):
            raise ValueError("Preset contains a non-finite value")
        return cls(k.reshape(3, 3, TEMPLATE_COUNT), exponent, *scalars)

    def copy(self) -> "Config":
        return Config(self.k.copy(), self.exponent.copy(), self.dt, self.decay, self.noise)

    def fingerprint(self) -> bytes:
        scalars = np.asarray([self.dt, self.decay, self.noise], dtype=np.float64)
        return self.k.tobytes() + self.exponent.tobytes() + scalars.tobytes()


@dataclass(frozen=True)
class Preset:
    key: str
    label: str
    config: Config


@dataclass
class RenderOptions:
    mode: str = "morph"
    preset: str = "Nova"
    palette: str = "RGB"
    scale: float = 0.5
    morph_rate: float = 1.0
    wildness: float = 0.18
    steps_per_frame: int = 1
    loops: int = 1
    frame_hold: int = 1
    quantize_levels: int = 0
    white_bias: float = 0.0
    contrast: float = 1.0
    saturation: float = 1.0
    brightness: float = 1.0
    seed: int | None = None
    preserve_audio: bool = True
    preview_fps: float = 5.0

    def validate(self) -> None:
        if self.mode not in {"morph", "preset"}:
            raise ValueError("Mode must be 'morph' or 'preset'")
        if not 0.02 <= self.scale <= 1.0:
            raise ValueError("Scale must be between 0.02 and 1.0")
        if not 0.01 <= self.morph_rate <= 20:
            raise ValueError("Morph rate must be between 0.01 and 20")
        if not 0 <= self.wildness <= 1:
            raise ValueError("Wildness must be between 0 and 1")
        if not 1 <= self.steps_per_frame <= 50:
            raise ValueError("Steps per frame must be between 1 and 50")
        if not 1 <= self.loops <= 1000:
            raise ValueError("Video loops must be between 1 and 1000")
        if not 1 <= self.frame_hold <= 1000:
            raise ValueError("Frame hold must be between 1 and 1000")
        if self.quantize_levels == 1 or not 0 <= self.quantize_levels <= 256:
            raise ValueError("Gray levels must be 0 for continuous color or an integer from 2 to 256")
        if not 0 <= self.white_bias <= 1:
            raise ValueError("White bias must be between 0 and 1")
        if not 0 <= self.contrast <= 4:
            raise ValueError("Contrast must be between 0 and 4")
        if not 0 <= self.saturation <= 4:
            raise ValueError("Saturation must be between 0 and 4")
        if not 0 <= self.brightness <= 4:
            raise ValueError("Brightness must be between 0 and 4")


@dataclass(frozen=True)
class ProgressUpdate:
    frame: int
    total_frames: int | None
    elapsed_seconds: float
    render_fps: float

    @property
    def fraction(self) -> float | None:
        if not self.total_frames:
            return None
        return min(1.0, self.frame / self.total_frames)


@dataclass(frozen=True)
class RenderResult:
    output_path: Path
    frames: int
    width: int
    height: int
    simulation_width: int
    simulation_height: int
    source_fps: float
    elapsed_seconds: float
    audio_preserved: bool
    warning: str | None = None


class RenderCancelled(RuntimeError):
    pass


def _sparse(entries: Sequence[tuple[int, int, int, float]]) -> list[float]:
    values = [0.0] * 45
    for destination, source, template, value in entries:
        values[(destination * 3 + source) * 5 + template] = value
    return values


def _core_payloads() -> list[tuple[str, dict]]:
    return [
        ("Nova", {"dt": .84, "decay": 0, "noise": .002, "exponent": [1, 1, 1], "k": _sparse([(0,1,4,.02),(1,2,4,.02),(2,0,4,1)])}),
        ("Swirls", {"dt": 1.38, "decay": .11, "noise": .001, "exponent": [1,1,1], "k": _sparse([(0,1,4,.02),(1,2,4,.02),(2,0,4,1),(2,1,3,.35)])}),
        ("Cells", {"dt": .28, "decay": 0, "noise": .001, "exponent": [1,1,1], "k": _sparse([(0,0,4,1),(0,1,3,-1),(0,2,3,-1),(1,0,3,-1),(1,1,4,1),(1,2,3,-1),(2,0,3,-1),(2,1,3,-1),(2,2,4,1)])}),
        ("Toxic Goo", {"dt": .08, "decay": 0, "noise": .002, "exponent": [1,1,1], "k": _sparse([(0,0,2,2),(0,0,4,1),(0,1,3,-1),(0,2,1,-10),(1,1,2,-10),(1,1,4,1),(1,2,1,-1.24),(1,2,3,-1),(2,0,1,10),(2,0,3,-1),(2,2,2,2),(2,2,4,1)])}),
        ("Fire", {"dt": .02, "decay": .045, "noise": .003, "exponent": [1,1,1], "k": _sparse([(0,0,3,-18.4),(0,0,4,-.88),(0,1,3,20.4),(0,1,4,1.88),(0,2,3,31.88),(0,2,4,-22.32),(1,2,3,-20.8),(1,2,4,1),(2,0,4,1.12),(2,1,4,-.42),(2,2,4,-5.56)])}),
        ("Undulating", {"dt": 1.38, "decay": .11, "noise": .001, "exponent": [1,1,1], "k": _sparse([(0,1,4,.02),(1,2,4,.02),(2,0,4,1),(2,1,3,6.52),(2,2,3,-.34)])}),
        ("Cross Fractal", {"dt": .02, "decay": .2, "noise": .002, "exponent": [1,1,1], "k": _sparse([(0,0,4,-.88),(0,1,4,1.88),(0,2,4,-22.32),(1,2,4,1),(2,0,4,1.12),(2,1,4,-.42),(2,2,4,-5.56)])}),
    ]


def load_presets(bank_path: Path | str = DEFAULT_BANK_PATH) -> list[Preset]:
    presets = [Preset(name, name, Config.from_payload(payload)) for name, payload in _core_payloads()]
    path = Path(bank_path)
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    rows = payload.get("presets")
    if not isinstance(rows, list):
        raise ValueError(f"{path} does not contain a preset list")
    for row in rows:
        try:
            preset_id = int(row["id"])
            config = Config.from_payload(row["config"])
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"Invalid saved preset row: {exc}") from exc
        presets.append(Preset(f"shared-{preset_id}", f"Shared {preset_id:03d}", config))
    return presets


# new-channel -> old-channel mappings. A canonical R/G swap followed by zero,
# one, or two rotations produces the three odd permutations as well.
COLOR_IDENTITIES: dict[str, tuple[int, int, int]] = {
    "RGB": (0, 1, 2),
    "GBR": (1, 2, 0),
    "BRG": (2, 0, 1),
    "GRB": (1, 0, 2),
    "RBG": (0, 2, 1),
    "BGR": (2, 1, 0),
}


def permute_config_channels(config: Config, permutation: Sequence[int]) -> Config:
    if sorted(permutation) != [0, 1, 2]:
        raise ValueError("A channel permutation must contain 0, 1, and 2 exactly once")
    order = np.asarray(permutation, dtype=np.intp)
    # Relabeling a physical channel requires both matrix axes to move together.
    k = config.k[order][:, order, :].copy()
    return Config(k, config.exponent[order].copy(), config.dt, config.decay, config.noise)


def random_color_identity(config: Config, rng: np.random.Generator) -> Config:
    swapped = (1, 0, 2) if rng.random() < .5 else (0, 1, 2)
    turns = int(rng.integers(0, 3))
    permutation = tuple(swapped[(index + turns) % 3] for index in range(3))
    return permute_config_channels(config, permutation)


def resolve_preset(presets: Sequence[Preset], query: str) -> Preset:
    normalized = query.strip().casefold()
    if normalized.isdigit():
        normalized = f"shared-{int(normalized)}"
    for preset in presets:
        if preset.key.casefold() == normalized or preset.label.casefold() == normalized:
            return preset
    choices = ", ".join(item.label for item in presets[:10])
    raise ValueError(f"Unknown preset '{query}'. Examples: {choices}")


def unique_configs(presets: Iterable[Preset]) -> list[Config]:
    seen: set[bytes] = set()
    result: list[Config] = []
    for preset in presets:
        fingerprint = preset.config.fingerprint()
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        result.append(preset.config)
    return result


def _mix_configs(start: Config, target: Config, jitter: Config, blend: float, wildness: float) -> Config:
    amount = math.sin(math.pi * blend) * wildness
    mix = lambda a, b: a + (b - a) * blend
    k = np.clip(mix(start.k, target.k) + jitter.k * amount, -100, 100).astype(np.float32)
    exponent = np.clip(mix(start.exponent, target.exponent) + jitter.exponent * amount, .25, 3).astype(np.float32)
    return Config(
        k,
        exponent,
        float(np.clip(mix(start.dt, target.dt) + jitter.dt * amount, .003, 2)),
        float(np.clip(mix(start.decay, target.decay) + jitter.decay * amount, 0, 1)),
        float(np.clip(mix(start.noise, target.noise) + jitter.noise * amount, 0, .02)),
    )


class MorphController:
    """Continuous random traversal through all unique anchors and color identities."""

    def __init__(self, presets: Sequence[Preset], rate: float, wildness: float, rng: np.random.Generator):
        self.anchors = unique_configs(presets)
        if len(self.anchors) < 2:
            raise ValueError("Morph mode requires at least two unique presets")
        self.rate = rate
        self.wildness = wildness
        self.rng = rng
        self.source_index = int(rng.integers(0, len(self.anchors)))
        self.start = random_color_identity(self.anchors[self.source_index], rng)
        self.target_index = self.source_index
        self.target = self.start
        self.jitter = self.start
        self.progress = 0.0
        self._queue_target()

    def _queue_target(self) -> None:
        target_index = self.source_index
        while target_index == self.source_index:
            target_index = int(self.rng.integers(0, len(self.anchors)))
        self.target_index = target_index
        self.target = random_color_identity(self.anchors[target_index], self.rng)
        signed = lambda shape: self.rng.uniform(-1, 1, size=shape).astype(np.float32)
        self.jitter = Config(
            signed(self.target.k.shape) * (.2 + np.minimum(2, np.abs(self.target.k) * .15)),
            signed(self.target.exponent.shape) * .4,
            float(self.rng.uniform(-.32, .32)),
            float(self.rng.uniform(-.2, .2)),
            float(self.rng.uniform(-.0015, .0015)),
        )
        self.progress = 0.0

    def next_config(self, source_fps: float) -> Config:
        duration_frames = max(1.0, source_fps * BASE_MORPH_SECONDS / self.rate)
        self.progress = min(1.0, self.progress + 1.0 / duration_frames)
        blend = self.progress * self.progress * (3 - 2 * self.progress)
        current = _mix_configs(self.start, self.target, self.jitter, blend, self.wildness)
        if self.progress >= 1:
            self.start = self.target
            self.source_index = self.target_index
            self._queue_target()
        return current


def initialize_field(height: int, width: int, rng: np.random.Generator) -> np.ndarray:
    return rng.uniform(.25, .75, size=(3, height, width)).astype(np.float32)


def preprocess_boundary(image: np.ndarray, options: RenderOptions) -> np.ndarray:
    """Apply version-2 image controls to an RGB float image in [0, 1]."""

    adjusted = np.clip(image * options.brightness, 0, 1)
    luminance = np.sum(adjusted * np.asarray([.2126, .7152, .0722], dtype=np.float32), axis=2, keepdims=True)
    adjusted = np.clip(luminance + options.saturation * (adjusted - luminance), 0, 1)
    if options.quantize_levels >= 2:
        gray = np.sum(adjusted * np.asarray([.2126, .7152, .0722], dtype=np.float32), axis=2, keepdims=True)
        gray = np.rint(gray * (options.quantize_levels - 1)) / (options.quantize_levels - 1)
        adjusted = np.repeat(gray, 3, axis=2)
    else:
        adjusted = np.clip((adjusted - .5) * options.contrast + .5, 0, 1)
    return np.clip(adjusted + options.white_bias, 0, 1).astype(np.float32, copy=False)


def frame_to_boundary(frame: np.ndarray, width: int, height: int, options: RenderOptions) -> np.ndarray:
    source_height, source_width = frame.shape[:2]
    scale = min(width / source_width, height / source_height)
    draw_width = max(1, int(round(source_width * scale)))
    draw_height = max(1, int(round(source_height * scale)))
    average = tuple(np.mean(frame.reshape(-1, 3), axis=0).round().astype(np.uint8).tolist())
    canvas = Image.new("RGB", (width, height), average)
    resized = Image.fromarray(frame, "RGB").resize((draw_width, draw_height), Image.Resampling.BILINEAR)
    canvas.paste(resized, ((width - draw_width) // 2, (height - draw_height) // 2))
    image = np.asarray(canvas, dtype=np.float32) / 255.0
    return preprocess_boundary(image, options).transpose(2, 0, 1)


def step_boundary_field(
    field: np.ndarray,
    weights: np.ndarray,
    config: Config,
    rng: np.random.Generator,
) -> np.ndarray:
    """Apply div(RGB * grad(field)) and the other weighted operators once."""

    accumulator = np.zeros_like(field)
    for source in range(3):
        center = field[source]
        mask = weights[source]
        right = np.roll(center, -1, axis=1)
        left = np.roll(center, 1, axis=1)
        down = np.roll(center, -1, axis=0)
        up = np.roll(center, 1, axis=0)
        mask_right = np.roll(mask, -1, axis=1)
        mask_left = np.roll(mask, 1, axis=1)
        mask_down = np.roll(mask, -1, axis=0)
        mask_up = np.roll(mask, 1, axis=0)
        dx = (right - center) * mask
        dy = (down - center) * mask
        gradient = np.sqrt(dx * dx + dy * dy)
        laplacian = (
            (mask + mask_right) * .5 * (right - center)
            + (mask + mask_left) * .5 * (left - center)
            + (mask + mask_down) * .5 * (down - center)
            + (mask + mask_up) * .5 * (up - center)
        )
        operators = (center * mask, dx, dy, gradient, laplacian)
        for template, operator in enumerate(operators):
            accumulator += config.k[:, source, template, None, None] * operator[None, :, :]

    value = (1 - config.decay) * field + config.dt * accumulator
    with np.errstate(over="ignore", invalid="ignore", divide="ignore"):
        value = np.sign(value) * np.power(np.abs(value), config.exponent[:, None, None])
    if config.noise > 0:
        value += rng.uniform(-.5, .5, size=value.shape).astype(np.float32) * config.noise
    np.nan_to_num(value, copy=False, nan=0.0, posinf=1.0, neginf=0.0)
    np.clip(value, 0, 1, out=value)
    return value.astype(np.float32, copy=False)


def field_to_rgb(field: np.ndarray) -> np.ndarray:
    return np.rint(field.transpose(1, 2, 0) * 255).astype(np.uint8)


def upscale_nearest(frame: np.ndarray, width: int, height: int) -> np.ndarray:
    """Expand an RGB frame by index selection only; no values are interpolated."""

    source_height, source_width = frame.shape[:2]
    if (source_width, source_height) == (width, height):
        return frame
    x_indices = np.minimum(
        ((np.arange(width, dtype=np.float64) + .5) * source_width / width).astype(np.intp),
        source_width - 1,
    )
    y_indices = np.minimum(
        ((np.arange(height, dtype=np.float64) + .5) * source_height / height).astype(np.intp),
        source_height - 1,
    )
    return frame[y_indices[:, None], x_indices[None, :], :]


def _even_dimension(value: float) -> int:
    rounded = max(2, int(round(value)))
    return rounded if rounded % 2 == 0 else rounded - 1


def _temporary_video_path(output_path: Path) -> Path:
    suffix = output_path.suffix if output_path.suffix else ".mp4"
    handle = tempfile.NamedTemporaryFile(prefix="cotm-morph-", suffix=suffix, dir=output_path.parent, delete=False)
    path = Path(handle.name)
    handle.close()
    path.unlink(missing_ok=True)
    return path


def _atempo_chain(frame_hold: int) -> str | None:
    """Build legal FFmpeg atempo stages whose product is 1 / frame_hold."""

    if frame_hold <= 1:
        return None
    remaining = 1.0 / frame_hold
    stages: list[float] = []
    while remaining < .5:
        stages.append(.5)
        remaining /= .5
    stages.append(remaining)
    return ",".join(f"atempo={stage:.10g}" for stage in stages)


def _remux_audio(
    video_path: Path,
    source_path: Path,
    output_path: Path,
    loops: int,
    frame_hold: int,
) -> tuple[bool, str | None]:
    muxed_path = _temporary_video_path(output_path)
    command = [
        imageio_ffmpeg.get_ffmpeg_exe(), "-nostdin", "-y", "-loglevel", "error",
        "-i", str(video_path),
    ]
    if loops > 1:
        command.extend(["-stream_loop", str(loops - 1)])
    command.extend(["-i", str(source_path), "-map", "0:v:0", "-map", "1:a?"])
    tempo_filter = _atempo_chain(frame_hold)
    if tempo_filter:
        command.extend(["-filter:a", tempo_filter])
    command.extend(["-c:v", "copy", "-c:a", "aac", "-shortest", str(muxed_path)])
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode == 0 and muxed_path.exists():
        os.replace(muxed_path, output_path)
        video_path.unlink(missing_ok=True)
        return True, None
    muxed_path.unlink(missing_ok=True)
    os.replace(video_path, output_path)
    detail = result.stderr.strip().splitlines()[-1] if result.stderr.strip() else "unknown ffmpeg error"
    return False, f"Visual render completed, but source audio was not copied: {detail}"


def render_video(
    input_path: Path | str,
    output_path: Path | str,
    options: RenderOptions,
    *,
    bank_path: Path | str = DEFAULT_BANK_PATH,
    progress_callback: Callable[[ProgressUpdate], None] | None = None,
    preview_callback: Callable[[np.ndarray], None] | None = None,
    cancel_event: threading.Event | None = None,
) -> RenderResult:
    options.validate()
    source_path = Path(input_path).expanduser().resolve()
    destination_path = Path(output_path).expanduser().resolve()
    if not source_path.is_file():
        raise FileNotFoundError(source_path)
    if source_path == destination_path:
        raise ValueError("Input and output paths must be different")
    destination_path.parent.mkdir(parents=True, exist_ok=True)

    presets = load_presets(bank_path)
    rng = np.random.default_rng(options.seed)
    morph = MorphController(presets, options.morph_rate, options.wildness, rng) if options.mode == "morph" else None
    if morph is None:
        selected = resolve_preset(presets, options.preset)
        if options.palette == "random":
            constant_config = random_color_identity(selected.config, rng)
        else:
            try:
                constant_config = permute_config_channels(selected.config, COLOR_IDENTITIES[options.palette])
            except KeyError as exc:
                raise ValueError(f"Unknown palette '{options.palette}'") from exc
    else:
        constant_config = None

    probe_reader = imageio_ffmpeg.read_frames(str(source_path), pix_fmt="rgb24")
    metadata = next(probe_reader)
    probe_reader.close()
    source_width, source_height = metadata["size"]
    source_fps = float(metadata.get("fps") or 30.0)
    duration = float(metadata.get("duration") or 0)
    total_frames = int(round(duration * source_fps)) * options.loops * options.frame_hold if duration > 0 and math.isfinite(duration) else None
    width = _even_dimension(source_width * options.scale)
    height = _even_dimension(source_height * options.scale)
    field = initialize_field(height, width, rng)
    temporary_path = _temporary_video_path(destination_path)
    writer = imageio_ffmpeg.write_frames(
        str(temporary_path),
        (source_width, source_height),
        fps=source_fps,
        codec="libx264",
        pix_fmt_in="rgb24",
        pix_fmt_out="yuv420p",
        macro_block_size=1,
        output_params=[
            "-crf", "12",
            "-preset", "medium",
            "-tune", "animation",
            "-profile:v", "high",
            "-tag:v", "avc1",
            "-movflags", "+faststart",
        ],
    )
    writer.send(None)
    started = time.perf_counter()
    frame_count = 0
    preview_interval = max(1, int(round(source_fps / max(.1, options.preview_fps))))
    active_reader = None
    try:
        for _loop_index in range(options.loops):
            active_reader = imageio_ffmpeg.read_frames(str(source_path), pix_fmt="rgb24")
            next(active_reader)
            for frame_bytes in active_reader:
                frame = np.frombuffer(frame_bytes, dtype=np.uint8).reshape(source_height, source_width, 3)
                weights = frame_to_boundary(frame, width, height, options)
                for _hold_index in range(options.frame_hold):
                    if cancel_event and cancel_event.is_set():
                        raise RenderCancelled("Render cancelled")
                    config = morph.next_config(source_fps) if morph else constant_config
                    assert config is not None
                    for _ in range(options.steps_per_frame):
                        field = step_boundary_field(field, weights, config, rng)
                    simulation_frame = field_to_rgb(field)
                    output_frame = upscale_nearest(simulation_frame, source_width, source_height)
                    writer.send(output_frame.tobytes())
                    frame_count += 1
                    elapsed = time.perf_counter() - started
                    if progress_callback:
                        progress_callback(ProgressUpdate(frame_count, total_frames, elapsed, frame_count / max(elapsed, 1e-9)))
                    if preview_callback and frame_count % preview_interval == 0:
                        preview_callback(simulation_frame.copy())
            active_reader.close()
            active_reader = None
    except BaseException:
        try:
            writer.close()
        finally:
            if active_reader is not None:
                active_reader.close()
            temporary_path.unlink(missing_ok=True)
        raise
    writer.close()

    warning = None
    audio_preserved = False
    if options.preserve_audio:
        audio_preserved, warning = _remux_audio(
            temporary_path,
            source_path,
            destination_path,
            options.loops,
            options.frame_hold,
        )
    else:
        os.replace(temporary_path, destination_path)
    elapsed = time.perf_counter() - started
    return RenderResult(
        destination_path,
        frame_count,
        source_width,
        source_height,
        width,
        height,
        source_fps,
        elapsed,
        audio_preserved,
        warning,
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Render COTM DEQ fields with version-2 video boundary controls.")
    parser.add_argument("input", nargs="?", help="Source video")
    parser.add_argument("output", nargs="?", help="Output video, normally .mp4")
    parser.add_argument("--mode", choices=("morph", "preset"), default="morph", help="Traverse the full bank or hold one preset")
    parser.add_argument("--preset", default="Nova", help="Preset name, shared ID, or key for preset mode")
    parser.add_argument("--palette", choices=("random", *COLOR_IDENTITIES.keys()), default="RGB", help="Constant color identity in preset mode")
    parser.add_argument("--scale", type=float, default=.5, help="Output size relative to source video (0.02–1.0)")
    parser.add_argument("--morph-rate", type=float, default=1.0, help="Morph traversal multiplier")
    parser.add_argument("--wildness", type=float, default=.18, help="Transition perturbation from 0 to 1")
    parser.add_argument("--steps-per-frame", type=int, default=1, help="Simulation steps per encoded output frame")
    parser.add_argument("--loops", type=int, default=1, help="Number of complete source-video passes")
    parser.add_argument("--frame-hold", type=int, default=1, help="Repeat every source frame this many times at the original output FPS")
    parser.add_argument("--gray-levels", type=int, default=0, help="0 keeps continuous RGB; 2 binarizes; 3–256 quantizes luminance")
    parser.add_argument("--white-bias", type=float, default=0, help="Constant boundary offset from 0 to 1")
    parser.add_argument("--contrast", type=float, default=1, help="Continuous-mode contrast multiplier")
    parser.add_argument("--saturation", type=float, default=1, help="Boundary saturation multiplier")
    parser.add_argument("--brightness", type=float, default=1, help="Boundary brightness multiplier")
    parser.add_argument("--seed", type=int, help="Repeatable random seed")
    parser.add_argument("--no-audio", action="store_true", help="Do not copy source audio into the result")
    parser.add_argument("--bank", type=Path, default=DEFAULT_BANK_PATH, help="Preset-bank JSON snapshot")
    parser.add_argument("--list-presets", action="store_true", help="Print the bundled preset keys and exit")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.list_presets:
        for preset in load_presets(args.bank):
            print(f"{preset.key:>12}  {preset.label}")
        return 0
    if not args.input or not args.output:
        parser.error("input and output are required unless --list-presets is used")
    options = RenderOptions(
        mode=args.mode,
        preset=args.preset,
        palette=args.palette,
        scale=args.scale,
        morph_rate=args.morph_rate,
        wildness=args.wildness,
        steps_per_frame=args.steps_per_frame,
        loops=args.loops,
        frame_hold=args.frame_hold,
        quantize_levels=args.gray_levels,
        white_bias=args.white_bias,
        contrast=args.contrast,
        saturation=args.saturation,
        brightness=args.brightness,
        seed=args.seed,
        preserve_audio=not args.no_audio,
    )
    last_report = 0.0

    def report(update: ProgressUpdate) -> None:
        nonlocal last_report
        if update.elapsed_seconds - last_report < 1 and update.frame != update.total_frames:
            return
        last_report = update.elapsed_seconds
        total = f"/{update.total_frames}" if update.total_frames else ""
        print(f"\rframe {update.frame}{total} · {update.render_fps:.2f} render fps", end="", flush=True)

    try:
        result = render_video(args.input, args.output, options, bank_path=args.bank, progress_callback=report)
    except (FileNotFoundError, ValueError, RenderCancelled) as exc:
        parser.exit(2, f"error: {exc}\n")
    print()
    print(
        f"Saved {result.frames} frames at {result.width}×{result.height} "
        f"from a {result.simulation_width}×{result.simulation_height} field to {result.output_path}"
    )
    print(f"Render time: {result.elapsed_seconds:.1f} seconds")
    if result.warning:
        print(f"Warning: {result.warning}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
