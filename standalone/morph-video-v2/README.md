# COTM Video Boundary Morph — Version 2

Version 2 is a separate, offline Python edition of the Child of the Machine nonlinear differential-equation morph bank. Version 1 remains unchanged beside it.

The program reads a source video one frame at a time and uses each adjusted frame as spatial RGB weights for the simulation operators. The generated nonlinear field becomes the output video; the source footage is a boundary condition, not an overlay. The weighted Laplacian is evaluated as `div(RGB * grad(field))`.

## Easiest Windows setup

1. Double-click `setup.bat` once. It creates an isolated `.venv` beside version 2 and installs NumPy, Pillow, and a self-contained FFmpeg backend.
2. Double-click `run_gui.bat`.
3. Choose a source video and destination.
4. Configure the **Dynamics & time** and **Boundary image** tabs, then render.

The setup script first looks for the normal Windows Python launcher, then `python`, then the Python runtime bundled with Codex on this computer. It does not alter the website, version 1, or the system Python installation.

## Boundary-image pipeline

Each resized RGB video frame is processed in this order:

1. **Brightness** multiplies the RGB values. `1.0×` is neutral.
2. **Saturation** moves colors toward or away from luminance. `0×` is grayscale, `1×` is neutral, and larger values boost saturation.
3. The program chooses one of two paths:
   - **Continuous mode** (`Gray levels = 0`) applies the contrast multiplier around middle gray.
   - **Quantized mode** (`Gray levels = 2–256`) converts to luminance and rounds to exactly that many evenly spaced gray values. Two levels is ordinary binarization.
4. **White bias** adds a constant offset and clips at white. This keeps formerly black regions active in the differential operators.

Contrast is intentionally ignored in quantized mode. Brightness and saturation happen before luminance quantization; white bias happens afterward.

## Time controls

- **Video loops** processes the complete source movie the entered number of times while retaining the field state between loops.
- **Frame hold factor** writes each source boundary frame repeatedly while keeping the original encoded FPS. A factor of 4 therefore changes the boundary at one quarter of its original effective rate and gives the simulation four times as many output frames to respond.
- **Steps / output frame** advances the simulation repeatedly inside each encoded frame. It increases evolution speed without changing video duration.

Looping and frame hold multiply the output duration. When audio copying is enabled, the source audio is looped and time-stretched without intentional pitch shifting to match those controls.

## Program modes

- **Full bank morph** traverses every unique bundled preset. Each new anchor independently receives one of the six RGB identities with equal probability. Morph rate and wildness match the website controls.
- **Single preset** holds one bundled core or shared preset for the entire movie. Its color identity may be fixed or selected randomly once at render start.

`preset-bank.json` is the frozen local snapshot created for version 1: 204 shared states plus the seven original core presets. Rendering never contacts or modifies the website.

## Resolution and performance

**Resolution scale controls only the simulation grid.** Every generated field frame is expanded back to the source video's exact pixel dimensions before it is encoded. The expansion is a direct nearest-neighbor index lookup: output pixels copy one simulation pixel exactly, with no bilinear, bicubic, or other interpolated values. The encoder receives the already full-size frame, so media players do not need to enlarge the coarse simulation themselves.

The output uses a standard H.264 High Profile, 4:2:0 MP4 stream for broad hardware and media-player compatibility. This changes the encoded color format, but it does not resize the frame or replace the explicit nearest-neighbor expansion.

The renderer is vectorized with NumPy and streams frames, so it never loads the whole movie into memory. Approximate work grows with:

`width × height × source frames × loops × frame hold × simulation steps`

Start with a short clip at 25–50% scale. On this machine, version 1's equivalent one-step pipeline rendered a 320×180 test at roughly 73 fps; full-resolution HD should still be treated as an offline job.

The destination is replaced only after a successful render. Cancelling leaves an existing output untouched.

## Command line

After running `setup.bat`, open PowerShell in this folder. This example creates four gray boundary regions, adds a small white floor, repeats every source frame three times, and loops the clip twice:

```powershell
.\.venv\Scripts\python.exe morph_video.py input.mp4 output.mp4 --mode morph --gray-levels 4 --white-bias 0.08 --frame-hold 3 --loops 2 --morph-rate 1.0 --wildness 0.18
```

Continuous-color processing with stronger contrast, saturation, and brightness:

```powershell
.\.venv\Scripts\python.exe morph_video.py input.mp4 output.mp4 --contrast 1.4 --saturation 1.6 --brightness 1.1
```

Hold shared preset 42 with binary boundary weights:

```powershell
.\.venv\Scripts\python.exe morph_video.py input.mp4 output.mp4 --mode preset --preset 42 --palette GBR --gray-levels 2
```

Use `--list-presets` to show every preset and `--help` for the complete CLI reference.
