# COTM Video Boundary Morph

This is a standalone, offline Python edition of the Child of the Machine nonlinear differential-equation morph bank. It reads a video one frame at a time, resizes each RGB frame to the simulation grid, and uses those three color planes as spatial weights for the field operators. The generated nonlinear field becomes the output video.

The source footage is a boundary condition—not an overlay. In particular, the Laplacian is evaluated as `div(RGB * grad(field))`, while gain and first-gradient terms are weighted by the corresponding source-video color channel.

## Easiest Windows setup

1. Double-click `setup.bat` once. It creates an isolated `.venv` beside the program and installs NumPy, Pillow, and a self-contained FFmpeg video backend.
2. Double-click `run_gui.bat`.
3. Choose a source video and output path.
4. Pick **Full bank morph** or **Single preset**, choose a resolution scale, and render.

The setup script first looks for the normal Windows Python launcher, then `python`, then the Python runtime bundled with Codex on this computer. It never alters the website or the system Python installation.

## Program modes

- **Full bank morph** traverses every unique bundled preset. Each new anchor independently receives one of the six RGB identities with equal probability, exactly like the website's Color cycle bank. Morph rate and wildness match the website controls.
- **Single preset** holds one of the bundled core or shared presets for the entire movie. Its palette can remain RGB, use any explicit channel permutation, or choose one random identity at the start of the render.

`preset-bank.json` is a local snapshot of the anonymous website bank taken when this tool was built. Rendering never contacts the website and never changes that bank.

## Resolution and speed

The renderer is vectorized with NumPy and streams frames, so it does not load the whole movie into memory. Work still grows approximately with:

`width × height × source frames × simulation steps per frame`

At 25–50% scale, short clips may preview near real time on a fast CPU. A 100% 1080p render has four times as many simulation pixels as a 50% render and should be treated as an offline job. Start with a short clip at 25% or 50%, then increase the resolution after finding settings you like.

The output is written to a temporary file and only replaces the chosen destination after success. Cancelling therefore leaves an existing output untouched. Source audio is copied when possible.

## Command line

Open PowerShell in this folder after running `setup.bat`:

```powershell
.\.venv\Scripts\python.exe morph_video.py input.mp4 output.mp4 --mode morph --scale 0.5 --morph-rate 1.0 --wildness 0.18
```

Hold shared preset 42 throughout the movie, with a fixed GBR identity:

```powershell
.\.venv\Scripts\python.exe morph_video.py input.mp4 output.mp4 --mode preset --preset 42 --palette GBR --scale 1.0
```

List every selectable preset:

```powershell
.\.venv\Scripts\python.exe morph_video.py --list-presets
```

Useful options:

- `--steps-per-frame 2` advances the field twice for every video frame.
- `--seed 1234` makes anchor choices, color identities, and noise repeatable.
- `--no-audio` skips the final audio-copy pass.
- `--bank another-bank.json` loads another snapshot with the same API format.

Run `morph_video.py --help` for the complete CLI reference.
