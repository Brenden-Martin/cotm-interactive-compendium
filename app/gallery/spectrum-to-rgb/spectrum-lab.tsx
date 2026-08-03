"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CIE_1931_2DEG_5NM } from "./cie-1931";

type Peak = { id: number; center: number; amplitude: number; width: number };
type DragMode = { id: number; kind: "peak" | "width" } | null;
type SpectrumMode = "emitters" | "blackbody";

const MIN_WAVELENGTH = 380;
const MAX_WAVELENGTH = 780;
const MAX_AMPLITUDE = 1.5;
const MIN_TEMPERATURE = 800;
const MAX_TEMPERATURE = 20000;
const SECOND_RADIATION_CONSTANT = 1.438776877e-2;
const WIEN_WAVELENGTH_CONSTANT = 2.897771955e-3;

const PRESETS: Record<string, Peak[]> = {
  sodium: [{ id: 1, center: 589, amplitude: 1.2, width: 4 }],
  mercury: [
    { id: 1, center: 436, amplitude: 1.05, width: 5 },
    { id: 2, center: 546, amplitude: 1.2, width: 5 },
    { id: 3, center: 578, amplitude: .65, width: 6 },
  ],
  hydrogen: [
    { id: 1, center: 410, amplitude: .42, width: 4 },
    { id: 2, center: 434, amplitude: .58, width: 4 },
    { id: 3, center: 486, amplitude: .8, width: 5 },
    { id: 4, center: 656, amplitude: 1.25, width: 5 },
  ],
  warmWhite: [
    { id: 1, center: 455, amplitude: .68, width: 35 },
    { id: 2, center: 565, amplitude: 1.1, width: 105 },
    { id: 3, center: 625, amplitude: .62, width: 80 },
  ],
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const spectrumAt = (wavelength: number, peaks: Peak[]) => peaks.reduce((sum, peak) => {
  const offset = (wavelength - peak.center) / Math.max(2, peak.width);
  return sum + peak.amplitude / (1 + 4 * offset * offset);
}, 0);

const blackbodyRadianceAt = (wavelength: number, temperature: number) => {
  const wavelengthMetres = wavelength * 1e-9;
  return 1 / (Math.pow(wavelengthMetres, 5) * Math.expm1(SECOND_RADIATION_CONSTANT / (wavelengthMetres * temperature)));
};

const blackbodyVisibleMaximum = (temperature: number) => Math.max(
  ...CIE_1931_2DEG_5NM.map(([wavelength]) => blackbodyRadianceAt(wavelength, temperature)),
  Number.MIN_VALUE,
);

const relativePowerAt = (wavelength: number, peaks: Peak[], mode: SpectrumMode, temperature: number, blackbodyMaximum: number) => mode === "blackbody"
  ? blackbodyRadianceAt(wavelength, temperature) / blackbodyMaximum * 1.25
  : spectrumAt(wavelength, peaks);

const encodeSrgb = (linear: number) => linear <= .0031308
  ? linear * 12.92
  : 1.055 * Math.pow(linear, 1 / 2.4) - .055;

const toHex = (values: number[]) => `#${values.map((value) => Math.round(value * 255).toString(16).padStart(2, "0")).join("")}`;

function calculateColor(peaks: Peak[], exposure: number, mode: SpectrumMode, temperature: number) {
  let X = 0;
  let Y = 0;
  let Z = 0;
  const blackbodyMaximum = blackbodyVisibleMaximum(temperature);
  for (const [wavelength, xBar, yBar, zBar] of CIE_1931_2DEG_5NM) {
    const power = relativePowerAt(wavelength, peaks, mode, temperature, blackbodyMaximum);
    X += power * xBar * 5;
    Y += power * yBar * 5;
    Z += power * zBar * 5;
  }
  const sum = X + Y + Z || 1;
  const chromaticity = { x: X / sum, y: Y / sum };
  const raw = [
    3.2409699419 * X - 1.5373831776 * Y - .4986107603 * Z,
    -.9692436363 * X + 1.8759675015 * Y + .0415550574 * Z,
    .0556300797 * X - .2039769589 * Y + 1.0569715142 * Z,
  ];
  const positiveMaximum = Math.max(...raw, .000001);
  const normalized = raw.map((channel) => channel / positiveMaximum * exposure);
  const outOfGamut = normalized.some((channel) => channel < 0 || channel > 1);
  const display = normalized.map((channel) => clamp(encodeSrgb(clamp(channel, 0, 1)), 0, 1));
  return { X, Y, Z, chromaticity, display, outOfGamut, hex: toHex(display) };
}

function wavelengthGuideColor(wavelength: number) {
  const stops: Array<[number, [number, number, number]]> = [
    [380,[50,21,110]],[440,[51,68,200]],[490,[22,139,211]],[530,[18,184,137]],
    [570,[155,207,53]],[590,[241,213,47]],[620,[242,111,46]],[680,[180,35,45]],[780,[80,10,22]],
  ];
  for (let index = 0; index < stops.length - 1; index++) {
    const [leftWave, leftColor] = stops[index];
    const [rightWave, rightColor] = stops[index + 1];
    if (wavelength > rightWave) continue;
    const mix = clamp((wavelength - leftWave) / (rightWave - leftWave), 0, 1);
    return leftColor.map((channel, channelIndex) => Math.round(channel * (1 - mix) + rightColor[channelIndex] * mix));
  }
  return stops[stops.length - 1][1];
}

export function SpectrumLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragMode>(null);
  const nextIdRef = useRef(4);
  const [peaks, setPeaks] = useState<Peak[]>(PRESETS.warmWhite);
  const [mode, setMode] = useState<SpectrumMode>("emitters");
  const [temperature, setTemperature] = useState(5778);
  const [selectedId, setSelectedId] = useState(2);
  const [showCurves, setShowCurves] = useState(true);
  const [exposure, setExposure] = useState(1);
  const [challenge, setChallenge] = useState("Try to make purple with one spectral line.");
  const color = useMemo(() => calculateColor(peaks, exposure, mode, temperature), [exposure, mode, peaks, temperature]);
  const selected = peaks.find((peak) => peak.id === selectedId) ?? peaks[0];
  const wienPeak = WIEN_WAVELENGTH_CONSTANT / temperature * 1e9;
  const temperaturePosition = Math.log(temperature / MIN_TEMPERATURE) / Math.log(MAX_TEMPERATURE / MIN_TEMPERATURE) * 1000;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let width = 0;
    let height = 0;
    const padding = { left: 48, right: 24, top: 24, bottom: 60 };
    const blackbodyMaximum = blackbodyVisibleMaximum(temperature);

    const xFor = (wavelength: number) => padding.left + (wavelength - MIN_WAVELENGTH) / (MAX_WAVELENGTH - MIN_WAVELENGTH) * (width - padding.left - padding.right);
    const yFor = (amplitude: number) => height - padding.bottom - clamp(amplitude / MAX_AMPLITUDE, 0, 1) * (height - padding.top - padding.bottom);
    const wavelengthFor = (x: number) => MIN_WAVELENGTH + clamp((x - padding.left) / (width - padding.left - padding.right), 0, 1) * (MAX_WAVELENGTH - MIN_WAVELENGTH);
    const amplitudeFor = (y: number) => clamp((height - padding.bottom - y) / (height - padding.top - padding.bottom) * MAX_AMPLITUDE, 0, MAX_AMPLITUDE);

    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#090d14";
      context.fillRect(0, 0, width, height);
      const wavelengthGradient = context.createLinearGradient(padding.left, 0, width - padding.right, 0);
      for (let wavelength = MIN_WAVELENGTH; wavelength <= MAX_WAVELENGTH; wavelength += 10) {
        const [red, green, blue] = wavelengthGuideColor(wavelength);
        wavelengthGradient.addColorStop((wavelength - MIN_WAVELENGTH) / (MAX_WAVELENGTH - MIN_WAVELENGTH), `rgba(${red},${green},${blue},.2)`);
      }
      context.fillStyle = wavelengthGradient;
      context.fillRect(padding.left, padding.top, width - padding.left - padding.right, height - padding.top - padding.bottom);

      context.strokeStyle = "rgba(244,240,223,.16)";
      context.lineWidth = 1;
      context.font = "800 9px Arial";
      context.fillStyle = "rgba(244,240,223,.7)";
      context.textAlign = "center";
      for (let wavelength = 400; wavelength <= 750; wavelength += 50) {
        const x = Math.round(xFor(wavelength)) + .5;
        context.beginPath();context.moveTo(x,padding.top);context.lineTo(x,height-padding.bottom);context.stroke();
        context.fillText(`${wavelength}`, x, height - 35);
      }
      for (let level = 0; level <= 3; level++) {
        const y = Math.round(yFor(level * .5)) + .5;
        context.beginPath();context.moveTo(padding.left,y);context.lineTo(width-padding.right,y);context.stroke();
      }

      if (showCurves) {
        const curves = [
          { index: 1, color: "rgba(255,91,91,.62)" },
          { index: 2, color: "rgba(111,235,126,.62)" },
          { index: 3, color: "rgba(89,160,255,.68)" },
        ];
        for (const curve of curves) {
          context.beginPath();
          context.strokeStyle = curve.color;
          context.lineWidth = 1.5;
          CIE_1931_2DEG_5NM.forEach((row, index) => {
            const x = xFor(row[0]);
            const y = yFor(row[curve.index] / 1.7826 * 1.34);
            if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
          });
          context.stroke();
        }
      }

      context.beginPath();
      for (let x = padding.left; x <= width - padding.right; x += 2) {
        const wavelength = wavelengthFor(x);
        const y = yFor(relativePowerAt(wavelength, peaks, mode, temperature, blackbodyMaximum));
        if (x === padding.left) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.lineTo(width - padding.right, height - padding.bottom);
      context.lineTo(padding.left, height - padding.bottom);
      context.closePath();
      const spectrumGradient = context.createLinearGradient(padding.left, 0, width - padding.right, 0);
      spectrumGradient.addColorStop(0, "rgba(139,89,255,.32)");
      spectrumGradient.addColorStop(.5, "rgba(245,230,80,.25)");
      spectrumGradient.addColorStop(1, "rgba(255,65,54,.3)");
      context.fillStyle = spectrumGradient;
      context.fill();
      context.beginPath();
      for (let x = padding.left; x <= width - padding.right; x += 2) {
        const y = yFor(relativePowerAt(wavelengthFor(x), peaks, mode, temperature, blackbodyMaximum));
        if (x === padding.left) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.strokeStyle = "#f4f0df";
      context.lineWidth = 3;
      context.stroke();

      if (mode === "emitters") for (const peak of peaks) {
        const selectedPeak = peak.id === selectedId;
        const peakX = xFor(peak.center);
        const peakY = yFor(spectrumAt(peak.center, peaks));
        const widthX = xFor(peak.center + peak.width / 2);
        const widthY = yFor(spectrumAt(peak.center + peak.width / 2, peaks));
        context.fillStyle = selectedPeak ? "#f4d64b" : "#f4f0df";
        context.strokeStyle = "#090d14";
        context.lineWidth = 2;
        context.beginPath();context.arc(peakX,peakY,selectedPeak?8:6,0,Math.PI*2);context.fill();context.stroke();
        context.fillRect(widthX - 6, widthY - 6, 12, 12);context.strokeRect(widthX - 6, widthY - 6, 12, 12);
      }
      context.fillStyle = "rgba(244,240,223,.64)";
      context.fillText("WAVELENGTH / nm", (padding.left + width - padding.right) / 2, height - 10);
      context.textAlign = "start";
    };

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.7);
      width = box.width;height = box.height;
      canvas.width = Math.round(width * ratio);canvas.height = Math.round(height * ratio);
      context.setTransform(ratio,0,0,ratio,0,0);context.imageSmoothingEnabled = true;draw();
    };
    const pointerCoordinates = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const pointerDown = (event: PointerEvent) => {
      if (mode !== "emitters") return;
      const point = pointerCoordinates(event);
      let nearest: { distance: number; drag: Exclude<DragMode, null> } | null = null;
      for (const peak of peaks) {
        const candidates = [
          { kind: "peak" as const, x: xFor(peak.center), y: yFor(spectrumAt(peak.center, peaks)) },
          { kind: "width" as const, x: xFor(peak.center + peak.width / 2), y: yFor(spectrumAt(peak.center + peak.width / 2, peaks)) },
        ];
        for (const candidate of candidates) {
          const distance = Math.hypot(point.x - candidate.x, point.y - candidate.y);
          if (distance < 22 && (!nearest || distance < nearest.distance)) nearest = { distance, drag: { id: peak.id, kind: candidate.kind } };
        }
      }
      if (!nearest) return;
      dragRef.current = nearest.drag;setSelectedId(nearest.drag.id);canvas.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;if (!drag) return;
      const point = pointerCoordinates(event);
      setPeaks((current) => current.map((peak) => {
        if (peak.id !== drag.id) return peak;
        if (drag.kind === "peak") return { ...peak, center: Math.round(wavelengthFor(point.x)), amplitude: Math.round(amplitudeFor(point.y) * 100) / 100 };
        return { ...peak, width: Math.round(clamp(Math.abs(wavelengthFor(point.x) - peak.center) * 2, 2, 140)) };
      }));
    };
    const pointerUp = () => { dragRef.current = null; };
    resize();window.addEventListener("resize",resize);canvas.addEventListener("pointerdown",pointerDown);canvas.addEventListener("pointermove",pointerMove);canvas.addEventListener("pointerup",pointerUp);canvas.addEventListener("pointercancel",pointerUp);
    return () => { window.removeEventListener("resize",resize);canvas.removeEventListener("pointerdown",pointerDown);canvas.removeEventListener("pointermove",pointerMove);canvas.removeEventListener("pointerup",pointerUp);canvas.removeEventListener("pointercancel",pointerUp); };
  }, [mode, peaks, selectedId, showCurves, temperature]);

  const updateSelected = (key: "center" | "amplitude" | "width", value: number) => {
    if (!selected) return;
    setPeaks((current) => current.map((peak) => peak.id === selected.id ? { ...peak, [key]: value } : peak));
  };
  const applyPreset = (key: keyof typeof PRESETS) => {
    const preset = PRESETS[key].map((peak) => ({ ...peak }));
    setPeaks(preset);setSelectedId(preset[0].id);nextIdRef.current = Math.max(...preset.map((peak) => peak.id)) + 1;setChallenge("Try to make purple with one spectral line.");
  };
  const addPeak = () => {
    if (peaks.length >= 6) return;
    const id = nextIdRef.current++;
    setPeaks((current) => [...current,{ id, center: 500 + Math.random() * 150, amplitude: .7, width: 24 }]);setSelectedId(id);
  };
  const singlePurpleAttempt = () => { setPeaks([{ id:1,center:420,amplitude:1.2,width:5 }]);setSelectedId(1);nextIdRef.current=2;setChallenge("Violet is spectral; display purple needs a non-spectral mixture. Add red, or reveal the solution."); };
  const revealPurple = () => { setPeaks([{id:1,center:440,amplitude:1,width:12},{id:2,center:650,amplitude:1.15,width:16}]);setSelectedId(1);setExposure(.16);nextIdRef.current=3;setChallenge("Two separated spectral regions bridge the line of purples: additive red plus blue/violet."); };
  const updateTemperaturePosition = (position: number) => {
    setTemperature(Math.round(MIN_TEMPERATURE * Math.pow(MAX_TEMPERATURE / MIN_TEMPERATURE, position / 1000)));
  };
  const updateTemperature = (value: number) => setTemperature(clamp(Math.round(value), MIN_TEMPERATURE, MAX_TEMPERATURE));

  return (
    <section className="spectrum-lab">
      <div className="spectrum-workbench">
        <div className="spectrum-mode-tabs" role="tablist" aria-label="Spectrum source">
          <button role="tab" aria-selected={mode === "emitters"} className={mode === "emitters" ? "active" : ""} onClick={() => setMode("emitters")}>Line emitters</button>
          <button role="tab" aria-selected={mode === "blackbody"} className={mode === "blackbody" ? "active" : ""} onClick={() => setMode("blackbody")}>Blackbody radiation</button>
        </div>
        <div className="spectrum-plot-head"><span>{mode === "blackbody" ? "Relative blackbody spectral radiance" : "Relative spectral power"}</span><span><i className="cmf-x" /> x̄ <i className="cmf-y" /> ȳ <i className="cmf-z" /> z̄</span></div>
        <canvas ref={canvasRef} className={`spectrum-canvas ${mode === "blackbody" ? "passive" : ""}`} aria-label={mode === "blackbody" ? `Blackbody spectrum at ${temperature} kelvin from 380 to 780 nanometers.` : "Editable emission spectrum from 380 to 780 nanometers. Drag circular peak handles and square width handles."} />
        <div className="spectrum-gesture-key">{mode === "emitters" ? <><b>● Drag peak</b><b>■ Drag half-width</b></> : <><b>{temperature.toLocaleString()} K</b><b>λmax {Math.round(wienPeak)} nm</b></>}<span>The background rainbow is an orientation guide; the calculation uses CIE data.</span></div>
        {mode === "emitters" ? <div className="purple-challenge">
          <div><span className="eyebrow">The purple challenge</span><p>{challenge}</p></div>
          <button onClick={singlePurpleAttempt}>Try one line</button><button onClick={revealPurple}>Reveal mixture</button>
        </div> : <div className="blackbody-summary">
          <div><span className="eyebrow">Heat becomes color</span><p>The curve is Planck&apos;s ideal thermal spectrum. Its wavelength peak follows Wien&apos;s law and may sit beyond this visible window.</p></div>
          <strong>{temperature.toLocaleString()} K</strong><span>Peak ≈ {Math.round(wienPeak)} nm</span>
        </div>}
      </div>
      <aside className="spectrum-controls">
        <div className="spectrum-result" style={{ backgroundColor: color.hex }}><span>Displayed sRGB</span><strong>{color.hex}</strong></div>
        <div className="spectrum-readout"><span>RGB <b>{color.display.map((channel) => Math.round(channel * 255)).join(" · ")}</b></span><span>xy <b>{color.chromaticity.x.toFixed(3)} · {color.chromaticity.y.toFixed(3)}</b></span><span className={color.outOfGamut ? "warning" : ""}>{color.outOfGamut ? "Gamut clipped" : "Inside sRGB"}</span></div>
        {mode === "emitters" ? <>
          <div className="spectrum-presets"><button onClick={() => applyPreset("sodium")}>Sodium</button><button onClick={() => applyPreset("mercury")}>Mercury</button><button onClick={() => applyPreset("hydrogen")}>Hydrogen</button><button onClick={() => applyPreset("warmWhite")}>Warm white</button></div>
          <div className="spectrum-actions"><button onClick={addPeak} disabled={peaks.length >= 6}>+ Add emitter</button><button onClick={() => { if (peaks.length <= 1 || !selected) return;const remaining=peaks.filter((peak)=>peak.id!==selected.id);setPeaks(remaining);setSelectedId(remaining[0].id); }}>Remove selected</button><button className={showCurves?"active":""} onClick={() => setShowCurves((value)=>!value)}>Observer curves</button></div>
        </> : <>
          <div className="spectrum-presets blackbody-presets"><button onClick={() => setTemperature(1800)}>Candle</button><button onClick={() => setTemperature(2856)}>Tungsten</button><button onClick={() => setTemperature(5778)}>Sun</button><button onClick={() => setTemperature(10000)}>Blue star</button></div>
          <div className="spectrum-actions blackbody-actions"><button className={showCurves?"active":""} onClick={() => setShowCurves((value)=>!value)}>Observer curves</button></div>
          <div className="blackbody-controls">
            <div className="emitter-title"><span>Blackbody temperature</span><b>{temperature.toLocaleString()} K</b></div>
            <label><span>Temperature</span><input type="number" min={MIN_TEMPERATURE} max={MAX_TEMPERATURE} step="1" value={temperature} onChange={(event)=>updateTemperature(Number(event.target.value))}/><input type="range" min="0" max="1000" step="1" value={temperaturePosition} onChange={(event)=>updateTemperaturePosition(Number(event.target.value))}/></label>
            <div className="blackbody-wien"><span>Wien peak</span><b>{Math.round(wienPeak)} nm</b></div>
          </div>
        </>}
        {mode === "emitters" && selected && <div className="emitter-controls"><div className="emitter-title"><span>Selected emitter</span><b>{Math.round(selected.center)} nm</b></div>
          <label><span>Center wavelength</span><output>{Math.round(selected.center)} nm</output><input type="range" min="380" max="780" step="1" value={selected.center} onChange={(event)=>updateSelected("center",Number(event.target.value))}/></label>
          <label><span>Amplitude</span><output>{selected.amplitude.toFixed(2)}</output><input type="range" min="0" max={MAX_AMPLITUDE} step=".01" value={selected.amplitude} onChange={(event)=>updateSelected("amplitude",Number(event.target.value))}/></label>
          <label><span>FWHM linewidth</span><output>{Math.round(selected.width)} nm</output><input type="range" min="2" max="140" step="1" value={selected.width} onChange={(event)=>updateSelected("width",Number(event.target.value))}/></label>
        </div>}
        <label className="spectrum-exposure"><span>Display exposure</span><output>{exposure.toFixed(2)}×</output><input type="range" min=".08" max="1.3" step=".01" value={exposure} onChange={(event)=>setExposure(Number(event.target.value))}/></label>
        <div className="spectrum-model-note"><b>{mode === "blackbody" ? "Planck → CIE 1931 2° → D65 sRGB" : "CIE 1931 2° → D65 sRGB"}</b><p>{mode === "blackbody" ? "Planck spectral radiance is evaluated with the NIST/CODATA second radiation constant, normalized over the visible plot, and passed through the same CIE observer and signed linear-sRGB transform as the emitter lab." : "Tristimulus values are integrated from the official CIE color-matching table at 5 nm intervals, then normalized for display exposure and gamut-mapped by clipping. Screens cannot reproduce every spectral color."}</p><a href="https://cie.co.at/datatable/cie-1931-colour-matching-functions-2-degree-observer" target="_blank" rel="noreferrer">CIE observer data ↗</a><a href="https://www.w3.org/TR/css-color-4/" target="_blank" rel="noreferrer">sRGB conversion reference ↗</a>{mode === "blackbody" && <a href="https://physics.nist.gov/cuu/pdf/all.pdf" target="_blank" rel="noreferrer">NIST / CODATA constants ↗</a>}</div>
      </aside>
    </section>
  );
}
