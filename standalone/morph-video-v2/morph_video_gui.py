"""Windows-friendly GUI for version 2 of the COTM video morph renderer."""

from __future__ import annotations

import queue
import threading
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

import numpy as np
from PIL import Image, ImageTk

from morph_video import (
    COLOR_IDENTITIES,
    ProgressUpdate,
    RenderCancelled,
    RenderOptions,
    RenderResult,
    load_presets,
    render_video,
)


class MorphVideoApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("COTM · Video Boundary Morph v2")
        self.root.geometry("1020x760")
        self.root.minsize(860, 680)
        self.messages: queue.Queue[tuple[str, object]] = queue.Queue()
        self.worker: threading.Thread | None = None
        self.cancel_event = threading.Event()
        self.closing = False
        self.preview_photo: ImageTk.PhotoImage | None = None
        self.presets = load_presets()
        self.preset_by_label = {preset.label: preset.key for preset in self.presets}

        self.input_var = tk.StringVar()
        self.output_var = tk.StringVar()
        self.mode_var = tk.StringVar(value="morph")
        self.preset_var = tk.StringVar(value=self.presets[0].label)
        self.palette_var = tk.StringVar(value="RGB")
        self.scale_var = tk.DoubleVar(value=.5)
        self.rate_var = tk.DoubleVar(value=1.0)
        self.wildness_var = tk.DoubleVar(value=.18)
        self.steps_var = tk.IntVar(value=1)
        self.loops_var = tk.IntVar(value=1)
        self.frame_hold_var = tk.IntVar(value=1)
        self.levels_var = tk.IntVar(value=0)
        self.white_bias_var = tk.DoubleVar(value=0)
        self.contrast_var = tk.DoubleVar(value=1)
        self.saturation_var = tk.DoubleVar(value=1)
        self.brightness_var = tk.DoubleVar(value=1)
        self.seed_var = tk.StringVar()
        self.audio_var = tk.BooleanVar(value=True)
        self.preview_var = tk.BooleanVar(value=True)
        self.status_var = tk.StringVar(value=f"Ready · {len(self.presets)} selectable presets")

        self._build_style()
        self._build_ui()
        self._mode_changed()
        self.levels_var.trace_add("write", self._levels_changed)
        self._levels_changed()
        self.root.after(60, self._drain_messages)
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    def _build_style(self) -> None:
        self.root.configure(bg="#d8c78f")
        style = ttk.Style(self.root)
        style.theme_use("clam")
        style.configure(".", background="#d8c78f", foreground="#1d2d2c", font=("Segoe UI", 10))
        style.configure("Card.TFrame", background="#e8deb9", relief="flat")
        style.configure("TLabel", background="#e8deb9", foreground="#243a38")
        style.configure("Title.TLabel", background="#d8c78f", foreground="#153c3b", font=("Segoe UI Semibold", 22))
        style.configure("Sub.TLabel", background="#d8c78f", foreground="#53625c", font=("Segoe UI", 10))
        style.configure("TButton", background="#536b65", foreground="#fff8dc", padding=(12, 7), borderwidth=0)
        style.map("TButton", background=[("active", "#345953"), ("disabled", "#a8a68f")])
        style.configure("Accent.TButton", background="#c9582f", foreground="#fff8dc", padding=(18, 9))
        style.map("Accent.TButton", background=[("active", "#a74327")])
        style.configure("TEntry", fieldbackground="#fff9e4", bordercolor="#8d8a73")
        style.configure("TCombobox", fieldbackground="#fff9e4", arrowsize=16)
        style.configure("Horizontal.TProgressbar", background="#68a89a", troughcolor="#c4b98e")

    def _build_ui(self) -> None:
        shell = ttk.Frame(self.root, padding=22)
        shell.pack(fill="both", expand=True)
        shell.columnconfigure(0, weight=5)
        shell.columnconfigure(1, weight=4)
        shell.rowconfigure(2, weight=1)

        ttk.Label(shell, text="VIDEO BOUNDARY MORPH", style="Title.TLabel").grid(row=0, column=0, columnspan=2, sticky="w")
        ttk.Label(
            shell,
            text="The source movie weights the RGB operators; the nonlinear field becomes a new precomputed movie.",
            style="Sub.TLabel",
        ).grid(row=1, column=0, columnspan=2, sticky="w", pady=(2, 18))

        controls = ttk.Frame(shell, style="Card.TFrame", padding=18)
        controls.grid(row=2, column=0, sticky="nsew", padx=(0, 10))
        controls.columnconfigure(1, weight=1)

        self._file_row(controls, 0, "Source video", self.input_var, self._choose_input)
        self._file_row(controls, 1, "Output video", self.output_var, self._choose_output)

        ttk.Label(controls, text="Program").grid(row=2, column=0, sticky="w", pady=(12, 5))
        mode_box = ttk.Frame(controls, style="Card.TFrame")
        mode_box.grid(row=2, column=1, columnspan=2, sticky="ew", pady=(12, 5))
        ttk.Radiobutton(mode_box, text="Full bank morph", variable=self.mode_var, value="morph", command=self._mode_changed).pack(side="left")
        ttk.Radiobutton(mode_box, text="Single preset", variable=self.mode_var, value="preset", command=self._mode_changed).pack(side="left", padx=(16, 0))

        ttk.Label(controls, text="Preset").grid(row=3, column=0, sticky="w", pady=5)
        self.preset_box = ttk.Combobox(controls, textvariable=self.preset_var, values=list(self.preset_by_label), state="readonly")
        self.preset_box.grid(row=3, column=1, columnspan=2, sticky="ew", pady=5)

        ttk.Label(controls, text="Color identity").grid(row=4, column=0, sticky="w", pady=5)
        self.palette_box = ttk.Combobox(
            controls,
            textvariable=self.palette_var,
            values=["RGB", "GBR", "BRG", "GRB", "RBG", "BGR", "random"],
            state="readonly",
        )
        self.palette_box.grid(row=4, column=1, columnspan=2, sticky="ew", pady=5)

        notebook = ttk.Notebook(controls)
        notebook.grid(row=5, column=0, columnspan=3, sticky="nsew", pady=(12, 4))
        dynamics = ttk.Frame(notebook, padding=12)
        boundary = ttk.Frame(notebook, padding=12)
        dynamics.columnconfigure(1, weight=1)
        boundary.columnconfigure(1, weight=1)
        notebook.add(dynamics, text="Dynamics & time")
        notebook.add(boundary, text="Boundary image")

        self.scale_control = self._slider_row(dynamics, 0, "Resolution scale", self.scale_var, .05, 1, .05, lambda value: f"{float(value)*100:.0f}%")
        self.rate_control = self._slider_row(dynamics, 1, "Morph rate", self.rate_var, .15, 3, .05, lambda value: f"{float(value):.2f}×")
        self.wildness_control = self._slider_row(dynamics, 2, "Wildness", self.wildness_var, 0, 1, .01, lambda value: f"{float(value)*100:.0f}%")

        ttk.Label(dynamics, text="Steps / output frame").grid(row=3, column=0, sticky="w", pady=5)
        ttk.Spinbox(dynamics, from_=1, to=50, textvariable=self.steps_var, width=8).grid(row=3, column=1, sticky="w", pady=5)
        ttk.Label(dynamics, text="Field updates per encoded frame").grid(row=3, column=2, sticky="e", pady=5)

        ttk.Label(dynamics, text="Video loops").grid(row=4, column=0, sticky="w", pady=5)
        ttk.Spinbox(dynamics, from_=1, to=1000, textvariable=self.loops_var, width=8).grid(row=4, column=1, sticky="w", pady=5)
        ttk.Label(dynamics, text="Complete source passes").grid(row=4, column=2, sticky="e", pady=5)

        ttk.Label(dynamics, text="Frame hold factor").grid(row=5, column=0, sticky="w", pady=5)
        ttk.Spinbox(dynamics, from_=1, to=1000, textvariable=self.frame_hold_var, width=8).grid(row=5, column=1, sticky="w", pady=5)
        ttk.Label(dynamics, text="Repeats frames; output FPS is unchanged").grid(row=5, column=2, sticky="e", pady=5)

        ttk.Label(dynamics, text="Random seed").grid(row=6, column=0, sticky="w", pady=5)
        ttk.Entry(dynamics, textvariable=self.seed_var).grid(row=6, column=1, sticky="ew", pady=5)
        ttk.Label(dynamics, text="Blank = new run").grid(row=6, column=2, sticky="e", pady=5)

        ttk.Label(boundary, text="Gray levels").grid(row=0, column=0, sticky="w", pady=5)
        self.levels_control = ttk.Spinbox(boundary, from_=0, to=256, textvariable=self.levels_var, width=8)
        self.levels_control.grid(row=0, column=1, sticky="w", pady=5)
        ttk.Label(boundary, text="0 continuous · 2 binary · 3–256 quantized").grid(row=0, column=2, sticky="e", pady=5)

        self.brightness_control = self._slider_row(boundary, 1, "Brightness", self.brightness_var, 0, 3, .05, lambda value: f"{float(value):.2f}×")
        self.saturation_control = self._slider_row(boundary, 2, "Saturation", self.saturation_var, 0, 4, .05, lambda value: f"{float(value):.2f}×")
        self.contrast_control = self._slider_row(boundary, 3, "Contrast", self.contrast_var, 0, 4, .05, lambda value: f"{float(value):.2f}×")
        self.white_bias_control = self._slider_row(boundary, 4, "White bias", self.white_bias_var, 0, 1, .01, lambda value: f"+{float(value):.2f}")
        ttk.Label(
            boundary,
            text="Contrast applies only in continuous mode. Quantized modes convert adjusted RGB to luminance first; white bias is added last so black regions remain active.",
            wraplength=500,
            justify="left",
        ).grid(row=5, column=0, columnspan=3, sticky="ew", pady=(9, 0))

        options = ttk.Frame(controls, style="Card.TFrame")
        options.grid(row=6, column=0, columnspan=3, sticky="w", pady=(12, 4))
        ttk.Checkbutton(options, text="Copy source audio", variable=self.audio_var).pack(side="left")
        ttk.Checkbutton(options, text="Show render preview", variable=self.preview_var).pack(side="left", padx=(18, 0))

        note = "Frame hold lengthens the movie and slows copied audio to match. High loop, hold, scale, or step values multiply render time."
        ttk.Label(controls, text=note, wraplength=520, justify="left").grid(row=7, column=0, columnspan=3, sticky="ew", pady=(8, 0))

        preview_card = ttk.Frame(shell, style="Card.TFrame", padding=12)
        preview_card.grid(row=2, column=1, sticky="nsew", padx=(10, 0))
        preview_card.columnconfigure(0, weight=1)
        preview_card.rowconfigure(1, weight=1)
        ttk.Label(preview_card, text="RENDER MONITOR").grid(row=0, column=0, sticky="w", pady=(0, 8))
        self.preview_label = tk.Label(preview_card, bg="#123532", fg="#a7e1c7", text="preview appears here", font=("Consolas", 10))
        self.preview_label.grid(row=1, column=0, sticky="nsew")

        footer = ttk.Frame(shell, padding=(0, 16, 0, 0))
        footer.grid(row=3, column=0, columnspan=2, sticky="ew")
        footer.columnconfigure(0, weight=1)
        self.progress = ttk.Progressbar(footer, mode="determinate", maximum=100)
        self.progress.grid(row=0, column=0, sticky="ew", padx=(0, 12))
        self.start_button = ttk.Button(footer, text="Render video", style="Accent.TButton", command=self._start)
        self.start_button.grid(row=0, column=1, padx=(0, 8))
        self.cancel_button = ttk.Button(footer, text="Cancel", command=self._cancel, state="disabled")
        self.cancel_button.grid(row=0, column=2)
        ttk.Label(footer, textvariable=self.status_var).grid(row=1, column=0, columnspan=3, sticky="w", pady=(8, 0))

    def _file_row(self, parent: ttk.Frame, row: int, label: str, variable: tk.StringVar, command) -> None:
        ttk.Label(parent, text=label).grid(row=row, column=0, sticky="w", pady=5)
        ttk.Entry(parent, textvariable=variable).grid(row=row, column=1, sticky="ew", pady=5)
        ttk.Button(parent, text="Browse", command=command).grid(row=row, column=2, padx=(8, 0), pady=5)

    def _slider_row(self, parent, row, label, variable, low, high, step, formatter):
        ttk.Label(parent, text=label).grid(row=row, column=0, sticky="w", pady=5)
        slider = ttk.Scale(parent, from_=low, to=high, variable=variable)
        slider.grid(row=row, column=1, sticky="ew", pady=5)
        output = ttk.Label(parent, width=8, anchor="e")
        output.grid(row=row, column=2, sticky="e", pady=5)

        def refresh(*_):
            snapped = round(float(variable.get()) / step) * step
            output.configure(text=formatter(snapped))

        variable.trace_add("write", refresh)
        refresh()
        return slider

    def _choose_input(self) -> None:
        path = filedialog.askopenfilename(title="Choose source video", filetypes=[("Video", "*.mp4 *.mov *.mkv *.avi *.webm"), ("All files", "*.*")])
        if not path:
            return
        self.input_var.set(path)
        if not self.output_var.get():
            source = Path(path)
            self.output_var.set(str(source.with_name(f"{source.stem}-cotm-morph-v2.mp4")))

    def _choose_output(self) -> None:
        path = filedialog.asksaveasfilename(title="Save generated video", defaultextension=".mp4", filetypes=[("MP4 video", "*.mp4"), ("Matroska video", "*.mkv")])
        if path:
            self.output_var.set(path)

    def _mode_changed(self) -> None:
        preset_mode = self.mode_var.get() == "preset"
        state = "readonly" if preset_mode else "disabled"
        self.preset_box.configure(state=state)
        self.palette_box.configure(state=state)
        self.rate_control.configure(state="disabled" if preset_mode else "normal")
        self.wildness_control.configure(state="disabled" if preset_mode else "normal")

    def _levels_changed(self, *_args) -> None:
        try:
            quantized = int(self.levels_var.get()) >= 2
        except (tk.TclError, ValueError):
            return
        self.contrast_control.configure(state="disabled" if quantized else "normal")

    def _build_options(self) -> RenderOptions:
        seed_text = self.seed_var.get().strip()
        return RenderOptions(
            mode=self.mode_var.get(),
            preset=self.preset_by_label[self.preset_var.get()],
            palette=self.palette_var.get(),
            scale=float(self.scale_var.get()),
            morph_rate=float(self.rate_var.get()),
            wildness=float(self.wildness_var.get()),
            steps_per_frame=int(self.steps_var.get()),
            loops=int(self.loops_var.get()),
            frame_hold=int(self.frame_hold_var.get()),
            quantize_levels=int(self.levels_var.get()),
            white_bias=float(self.white_bias_var.get()),
            contrast=float(self.contrast_var.get()),
            saturation=float(self.saturation_var.get()),
            brightness=float(self.brightness_var.get()),
            seed=int(seed_text) if seed_text else None,
            preserve_audio=bool(self.audio_var.get()),
        )

    def _start(self) -> None:
        if self.worker and self.worker.is_alive():
            return
        source = Path(self.input_var.get()).expanduser()
        output = Path(self.output_var.get()).expanduser()
        if not source.is_file():
            messagebox.showerror("Source video", "Choose an existing source video first.")
            return
        if not output.name:
            messagebox.showerror("Output video", "Choose an output path first.")
            return
        if output.exists() and not messagebox.askyesno("Replace output?", f"Replace {output.name} after the new render finishes?"):
            return
        try:
            options = self._build_options()
            options.validate()
        except (KeyError, ValueError) as exc:
            messagebox.showerror("Settings", str(exc))
            return
        self.cancel_event = threading.Event()
        self.progress.configure(value=0, mode="determinate")
        self.start_button.configure(state="disabled")
        self.cancel_button.configure(state="normal")
        self.status_var.set("Preparing decoder and simulation field…")
        show_preview = bool(self.preview_var.get())

        def progress(update: ProgressUpdate) -> None:
            self.messages.put(("progress", update))

        def preview(frame: np.ndarray) -> None:
            self.messages.put(("preview", frame))

        def work() -> None:
            try:
                result = render_video(
                    source,
                    output,
                    options,
                    progress_callback=progress,
                    preview_callback=preview if show_preview else None,
                    cancel_event=self.cancel_event,
                )
                self.messages.put(("done", result))
            except RenderCancelled:
                self.messages.put(("cancelled", None))
            except Exception as exc:  # surfaced to the desktop user
                self.messages.put(("error", exc))

        self.worker = threading.Thread(target=work, name="cotm-video-render", daemon=True)
        self.worker.start()

    def _cancel(self) -> None:
        self.cancel_event.set()
        self.cancel_button.configure(state="disabled")
        self.status_var.set("Cancelling after the current frame…")

    def _drain_messages(self) -> None:
        try:
            while True:
                kind, payload = self.messages.get_nowait()
                if kind == "progress":
                    update = payload
                    assert isinstance(update, ProgressUpdate)
                    if update.fraction is None:
                        self.progress.configure(mode="indeterminate")
                        self.progress.start(12)
                        count = f"frame {update.frame}"
                    else:
                        self.progress.stop()
                        self.progress.configure(mode="determinate", value=update.fraction * 100)
                        count = f"frame {update.frame}/{update.total_frames}"
                    self.status_var.set(f"{count} · {update.render_fps:.2f} render fps · {update.elapsed_seconds:.1f}s elapsed")
                elif kind == "preview":
                    frame = payload
                    assert isinstance(frame, np.ndarray)
                    image = Image.fromarray(frame, "RGB")
                    image.thumbnail((420, 420), Image.Resampling.BILINEAR)
                    self.preview_photo = ImageTk.PhotoImage(image)
                    self.preview_label.configure(image=self.preview_photo, text="")
                elif kind == "done":
                    result = payload
                    assert isinstance(result, RenderResult)
                    self._finished()
                    audio = " · source audio copied" if result.audio_preserved else ""
                    self.status_var.set(
                        f"Complete · {result.frames} frames · {result.width}×{result.height} output "
                        f"from {result.simulation_width}×{result.simulation_height} field{audio}"
                    )
                    detail = (
                        f"Saved to:\n{result.output_path}\n\n"
                        f"Nearest-neighbor output: {result.width}×{result.height}\n"
                        f"Simulation grid: {result.simulation_width}×{result.simulation_height}\n\n"
                        f"Render time: {result.elapsed_seconds:.1f} seconds"
                    )
                    if result.warning:
                        detail += f"\n\n{result.warning}"
                    messagebox.showinfo("Render complete", detail)
                elif kind == "cancelled":
                    self._finished()
                    self.status_var.set("Cancelled · the previous output was left untouched")
                elif kind == "error":
                    self._finished()
                    self.status_var.set("Render failed")
                    messagebox.showerror("Render failed", str(payload))
        except queue.Empty:
            pass
        self.root.after(60, self._drain_messages)

    def _finished(self) -> None:
        self.progress.stop()
        self.start_button.configure(state="normal")
        self.cancel_button.configure(state="disabled")
        if self.closing:
            self.root.after_idle(self.root.destroy)

    def _on_close(self) -> None:
        if self.worker and self.worker.is_alive():
            if not messagebox.askyesno("Render in progress", "Cancel the render and close?"):
                return
            self.closing = True
            self.cancel_event.set()
            self.status_var.set("Cancelling safely before closing…")
            return
        self.root.destroy()


def main() -> None:
    root = tk.Tk()
    MorphVideoApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
