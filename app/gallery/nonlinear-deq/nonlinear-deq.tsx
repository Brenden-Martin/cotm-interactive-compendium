"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const W = 160;
const H = 90;
const SIZE = W * H;
const templates = ["id", "dx", "dy", "|grad|", "lap"];
const channels = ["R", "G", "B"];

type Config = { k: number[]; exponent: number[]; dt: number; decay: number; noise: number };
type FieldState = [Float32Array, Float32Array, Float32Array];
type Preset = Config & { name: string };

const indexK = (dest: number, source: number, template: number) => (dest * 3 + source) * 5 + template;
const sparseK = (entries: Array<[number, number, number, number]>) => {
  const values = Array(45).fill(0);
  entries.forEach(([d, s, t, value]) => { values[indexK(d, s, t)] = value; });
  return values;
};

const presets: Preset[] = [
  { name: "Nova", dt: .84, decay: 0, noise: .002, exponent: [1, 1, 1], k: sparseK([[0,1,4,.02],[1,2,4,.02],[2,0,4,1]]) },
  { name: "Swirls", dt: 1.38, decay: .11, noise: .001, exponent: [1,1,1], k: sparseK([[0,1,4,.02],[1,2,4,.02],[2,0,4,1],[2,1,3,.35]]) },
  { name: "Cells", dt: .28, decay: 0, noise: .001, exponent: [1,1,1], k: sparseK([[0,0,4,1],[0,1,3,-1],[0,2,3,-1],[1,0,3,-1],[1,1,4,1],[1,2,3,-1],[2,0,3,-1],[2,1,3,-1],[2,2,4,1]]) },
  { name: "Toxic Goo", dt: .08, decay: 0, noise: .002, exponent: [1,1,1], k: sparseK([[0,0,2,2],[0,0,4,1],[0,1,3,-1],[0,2,1,-10],[1,1,2,-10],[1,1,4,1],[1,2,1,-1.24],[1,2,3,-1],[2,0,1,10],[2,0,3,-1],[2,2,2,2],[2,2,4,1]]) },
  { name: "Fire", dt: .02, decay: .045, noise: .003, exponent: [1,1,1], k: sparseK([[0,0,3,-18.4],[0,0,4,-.88],[0,1,3,20.4],[0,1,4,1.88],[0,2,3,31.88],[0,2,4,-22.32],[1,2,3,-20.8],[1,2,4,1],[2,0,4,1.12],[2,1,4,-.42],[2,2,4,-5.56]]) },
  { name: "Undulating", dt: 1.38, decay: .11, noise: .001, exponent: [1,1,1], k: sparseK([[0,1,4,.02],[1,2,4,.02],[2,0,4,1],[2,1,3,6.52],[2,2,3,-.34]]) },
  { name: "Cross Fractal", dt: .02, decay: .2, noise: .002, exponent: [1,1,1], k: sparseK([[0,0,4,-.88],[0,1,4,1.88],[0,2,4,-22.32],[1,2,4,1],[2,0,4,1.12],[2,1,4,-.42],[2,2,4,-5.56]]) },
];

const cloneConfig = (preset: Preset): Config => ({ k: [...preset.k], exponent: [...preset.exponent], dt: preset.dt, decay: preset.decay, noise: preset.noise });
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function NonlinearDeq() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<FieldState>([new Float32Array(SIZE), new Float32Array(SIZE), new Float32Array(SIZE)]);
  const configRef = useRef<Config>(cloneConfig(presets[0]));
  const frameRef = useRef(0);
  const pointerRef = useRef({ active: false, x: 0, y: 0 });
  const paintModeRef = useRef<"color" | "erase">("color");
  const selectedPaintRef = useRef<"color" | "erase">("color");
  const brushRef = useRef(7);
  const pausedRef = useRef(false);
  const autoMutateRef = useRef(true);
  const mutationTimeRef = useRef(0);
  const [config, setConfig] = useState<Config>(cloneConfig(presets[0]));
  const [presetName, setPresetName] = useState("Nova");
  const [destination, setDestination] = useState(0);
  const [paintMode, setPaintMode] = useState<"color" | "erase">("color");
  const [brush, setBrush] = useState(7);
  const [paused, setPaused] = useState(false);
  const [autoMutate, setAutoMutate] = useState(true);
  const [mutationCount, setMutationCount] = useState(0);

  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => {
    selectedPaintRef.current = paintMode;
    paintModeRef.current = paintMode;
  }, [paintMode]);
  useEffect(() => { brushRef.current = brush; }, [brush]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { autoMutateRef.current = autoMutate; }, [autoMutate]);

  const seedNoise = useCallback(() => {
    const next: FieldState = [new Float32Array(SIZE), new Float32Array(SIZE), new Float32Array(SIZE)];
    for (let index = 0; index < SIZE; index++) {
      next[0][index] = clamp01(.5 + (Math.random() - .5) * .5);
      next[1][index] = clamp01(.5 + (Math.random() - .5) * .5);
      next[2][index] = clamp01(.5 + (Math.random() - .5) * .5);
    }
    fieldRef.current = next;
  }, []);

  const applyPreset = (name: string) => {
    const preset = presets.find((item) => item.name === name) ?? presets[0];
    setPresetName(preset.name);
    setConfig(cloneConfig(preset));
    seedNoise();
  };

  const mutate = useCallback(() => {
    setConfig((current) => {
      const next = { ...current, k: [...current.k], exponent: [...current.exponent] };
      const choice = Math.floor(Math.random() * 4);
      if (choice === 0) next.dt = .003 + Math.random() * 1.5;
      else if (choice === 1) next.decay = Math.random() * .8;
      else if (choice === 2) next.exponent[Math.floor(Math.random() * 3)] = .5 + Math.random() * 1.2;
      else {
        const target = next.k.reduce((sum, value) => sum + Math.abs(value), 0) || 1;
        next.k = next.k.map((value) => value * .98);
        const index = Math.floor(Math.random() * next.k.length);
        const freed = target - next.k.reduce((sum, value) => sum + Math.abs(value), 0);
        next.k[index] += (Math.random() < .5 ? -1 : 1) * freed;
      }
      return next;
    });
    setMutationCount((count) => count + 1);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const image = ctx.createImageData(W, H);
    seedNoise();
    mutationTimeRef.current = performance.now();

    const paint = () => {
      if (!pointerRef.current.active) return;
      const cx = Math.floor(pointerRef.current.x * W);
      const cy = Math.floor(pointerRef.current.y * H);
      const radius = brushRef.current;
      const color = paintModeRef.current === "erase" ? [0,0,0] : [Math.random(), Math.random(), Math.random()];
      const field = fieldRef.current;
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const x = (cx + dx + W) % W;
        const y = (cy + dy + H) % H;
        const index = y * W + x;
        field[0][index] = color[0]; field[1][index] = color[1]; field[2][index] = color[2];
      }
    };

    const step = () => {
      const src = fieldRef.current;
      const next: FieldState = [new Float32Array(SIZE), new Float32Array(SIZE), new Float32Array(SIZE)];
      const cfg = configRef.current;
      for (let y = 0; y < H; y++) {
        const yu = ((y - 1 + H) % H) * W;
        const yd = ((y + 1) % H) * W;
        const row = y * W;
        for (let x = 0; x < W; x++) {
          const xl = (x - 1 + W) % W;
          const xr = (x + 1) % W;
          const index = row + x;
          for (let dest = 0; dest < 3; dest++) {
            let acc = 0;
            for (let source = 0; source < 3; source++) {
              const center = src[source][index];
              const dx = src[source][row + xr] - center;
              const dy = src[source][yd + x] - center;
              const grad = Math.sqrt(dx * dx + dy * dy);
              const lap = src[source][row + xl] + src[source][row + xr] + src[source][yu + x] + src[source][yd + x] - 4 * center;
              const values = [center, dx, dy, grad, lap];
              for (let template = 0; template < 5; template++) acc += cfg.k[indexK(dest, source, template)] * values[template];
            }
            let value = (1 - cfg.decay) * src[dest][index] + cfg.dt * acc;
            value = Math.sign(value) * Math.pow(Math.abs(value), cfg.exponent[dest]);
            if (cfg.noise > 0) value += (Math.random() - .5) * cfg.noise;
            next[dest][index] = clamp01(value);
          }
        }
      }
      fieldRef.current = next;
    };

    const draw = () => {
      const field = fieldRef.current;
      for (let index = 0; index < SIZE; index++) {
        const offset = index * 4;
        image.data[offset] = Math.round(field[0][index] * 255);
        image.data[offset + 1] = Math.round(field[1][index] * 255);
        image.data[offset + 2] = Math.round(field[2][index] * 255);
        image.data[offset + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
    };

    const locate = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current.x = Math.max(0, Math.min(.999, (event.clientX - rect.left) / rect.width));
      pointerRef.current.y = Math.max(0, Math.min(.999, (event.clientY - rect.top) / rect.height));
    };
    const down = (event: PointerEvent) => {
      locate(event);
      pointerRef.current.active = true;
      paintModeRef.current = event.button === 2 ? "erase" : selectedPaintRef.current;
      canvas.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => locate(event);
    const up = () => { pointerRef.current.active = false; paintModeRef.current = selectedPaintRef.current; };
    const preventMenu = (event: MouseEvent) => event.preventDefault();

    let last = performance.now();
    const loop = (now: number) => {
      if (!pausedRef.current && now - last > 24) {
        paint();
        step();
        last = now;
      } else paint();
      if (autoMutateRef.current && now - mutationTimeRef.current > 5000) {
        mutate();
        mutationTimeRef.current = now;
      }
      draw();
      frameRef.current = requestAnimationFrame(loop);
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("contextmenu", preventMenu);
    frameRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frameRef.current);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("contextmenu", preventMenu);
    };
  }, [mutate, seedNoise]);

  const setScalar = (key: "dt" | "decay" | "noise", value: number) => setConfig((current) => ({ ...current, [key]: value }));
  const setExponent = (channel: number, value: number) => setConfig((current) => ({ ...current, exponent: current.exponent.map((item, index) => index === channel ? value : item) }));
  const setCoefficient = (source: number, template: number, value: number) => setConfig((current) => {
    const k = [...current.k];
    k[indexK(destination, source, template)] = value;
    return { ...current, k };
  });

  return (
    <section className="deq-lab">
      <div className="deq-stage">
        <canvas ref={canvasRef} width={W} height={H} className="deq-canvas" aria-label="Interactive three-channel nonlinear differential-equation field. Drag to paint into the system." />
        <div className="deq-status"><b>{paused ? "FIELD PAUSED" : "FIELD RUNNING"}</b><span>{mutationCount} parameter mutations</span></div>
      </div>
      <aside className="deq-controls">
        <div className="deq-top-controls">
          <label className="preset-select"><span className="control-label">Preset</span><select value={presetName} onChange={(event) => applyPreset(event.target.value)}>{presets.map((preset) => <option key={preset.name}>{preset.name}</option>)}</select></label>
          <div className="transport deq-transport"><button onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</button><button onClick={seedNoise}>Re-seed</button><button onClick={mutate}>Mutate now</button></div>
        </div>
        <div className="control-block">
          <span className="control-label">Screensaver evolution</span>
          <button className={`toggle-wide ${autoMutate ? "active" : ""}`} onClick={() => setAutoMutate((value) => !value)}>Auto-mutate every 5 seconds · {autoMutate ? "on" : "off"}</button>
        </div>
        <div className="deq-scalar-grid">
          <label><span>Time step</span><input type="number" step=".001" value={Number(config.dt.toFixed(3))} onChange={(event) => setScalar("dt", Number(event.target.value))} /></label>
          <label><span>Decay</span><input type="number" step=".001" value={Number(config.decay.toFixed(3))} onChange={(event) => setScalar("decay", Number(event.target.value))} /></label>
          <label><span>Noise</span><input type="number" step=".001" value={Number(config.noise.toFixed(3))} onChange={(event) => setScalar("noise", Number(event.target.value))} /></label>
        </div>
        <div className="control-block">
          <span className="control-label">Nonlinear exponent by channel</span>
          <div className="exponent-row">{config.exponent.map((value, index) => <label key={channels[index]}><i className={`channel-${index}`} />{channels[index]}<input type="number" step=".05" value={Number(value.toFixed(2))} onChange={(event) => setExponent(index, Number(event.target.value))} /></label>)}</div>
        </div>
        <div className="control-block matrix-block">
          <div className="matrix-title"><span className="control-label">Coupling tensor · destination</span><div className="channel-tabs">{channels.map((channel, index) => <button key={channel} className={destination === index ? "active" : ""} onClick={() => setDestination(index)}>{channel}</button>)}</div></div>
          <div className="matrix-grid">
            <span />
            {templates.map((template) => <b key={template}>{template}</b>)}
            {channels.map((channel, source) => [
              <strong key={`${channel}-label`}>{channel}→</strong>,
              ...templates.map((template, templateIndex) => <input key={`${channel}-${template}`} aria-label={`${channel} through ${template} into ${channels[destination]}`} type="number" step=".1" value={Number(config.k[indexK(destination, source, templateIndex)].toFixed(3))} onChange={(event) => setCoefficient(source, templateIndex, Number(event.target.value))} />),
            ])}
          </div>
        </div>
        <div className="control-block">
          <span className="control-label">Brush</span>
          <div className="segmented"><button className={paintMode === "color" ? "active" : ""} onClick={() => setPaintMode("color")}>Color</button><button className={paintMode === "erase" ? "active" : ""} onClick={() => setPaintMode("erase")}>Erase</button></div>
          <label className="brush-size"><span>Radius</span><input type="range" min="1" max="22" value={brush} onChange={(event) => setBrush(Number(event.target.value))} /><output>{brush}</output></label>
        </div>
        <p className="lab-note">Paint directly into the field. Each matrix cell maps a source color through a spatial operator into the selected destination color. Right-click erases on desktop.</p>
      </aside>
    </section>
  );
}
