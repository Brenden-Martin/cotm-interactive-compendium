"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Particle3D = { x: number; y: number; z: number; vx: number; vy: number; vz: number; heat: number };
type Range = { min: number; max: number };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const SLIDER_STEPS = 1000;
const VOLUME_RADIUS = .5;
const VOXEL_DEFAULTS = {
  heaterGain: 94.8,
  heatDecay: .00119,
  buoyancy: 701,
  cohesion: .03,
  surfaceTension: 3.377,
  count: 180,
  heaterSize: 1,
  volumeHeight: 1.352,
  voxelSize: 5,
};
const VOXEL_RANGES = {
  heaterGain: { min: .1, max: 250 },
  heatDecay: { min: .0001, max: .1 },
  buoyancy: { min: 1, max: 1500 },
  cohesion: { min: .005, max: .5 },
  surfaceTension: { min: .01, max: 8 },
  count: { min: 60, max: 900 },
  heaterSize: { min: .25, max: 2 },
  volumeHeight: { min: .7, max: 2.5 },
};

const toExponentialPosition = (value: number, range: Range) =>
  clamp(Math.log(Math.max(value, range.min) / range.min) / Math.log(range.max / range.min) * SLIDER_STEPS, 0, SLIDER_STEPS);
const fromExponentialPosition = (position: number, range: Range) =>
  range.min * Math.pow(range.max / range.min, clamp(position, 0, SLIDER_STEPS) / SLIDER_STEPS);
const roundTo = (value: number, places: number) => {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
};

function ExpControl({ label, value, range, manualMax, places, onChange }: {
  label: string;
  value: number;
  range: Range;
  manualMax: number;
  places: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="voxel-slider">
      <label><span>{label}</span><input aria-label={`Enter ${label}`} type="number" min="0" max={manualMax} step={places === 0 ? 1 : 10 ** -places} value={value} onChange={(event) => onChange(clamp(Number(event.target.value), 0, manualMax))} /></label>
      <input aria-label={`Adjust ${label} exponentially`} type="range" min="0" max={SLIDER_STEPS} step="1" value={toExponentialPosition(value, range)} onChange={(event) => onChange(roundTo(fromExponentialPosition(Number(event.target.value), range), places))} />
    </div>
  );
}

export function LavaVolume() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle3D[]>([]);
  const frameRef = useRef(0);
  const worldHeightRef = useRef(VOXEL_DEFAULTS.volumeHeight);
  const cameraRef = useRef({ yaw: -.62, pitch: .22, zoom: 1, dragging: false, x: 0, y: 0 });
  const paramsRef = useRef({ ...VOXEL_DEFAULTS, paused: false, heater: true, autoRotate: true });
  const [heaterGain, setHeaterGain] = useState(VOXEL_DEFAULTS.heaterGain);
  const [heatDecay, setHeatDecay] = useState(VOXEL_DEFAULTS.heatDecay);
  const [buoyancy, setBuoyancy] = useState(VOXEL_DEFAULTS.buoyancy);
  const [cohesion, setCohesion] = useState(VOXEL_DEFAULTS.cohesion);
  const [surfaceTension, setSurfaceTension] = useState(VOXEL_DEFAULTS.surfaceTension);
  const [particleCount, setParticleCount] = useState(VOXEL_DEFAULTS.count);
  const [heaterSize, setHeaterSize] = useState(VOXEL_DEFAULTS.heaterSize);
  const [volumeHeight, setVolumeHeight] = useState(VOXEL_DEFAULTS.volumeHeight);
  const [voxelSize, setVoxelSize] = useState(VOXEL_DEFAULTS.voxelSize);
  const [paused, setPaused] = useState(false);
  const [heater, setHeater] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [fps, setFps] = useState(60);
  const [activeCount, setActiveCount] = useState(VOXEL_DEFAULTS.count);
  const [activeHeight, setActiveHeight] = useState(VOXEL_DEFAULTS.volumeHeight);

  useEffect(() => {
    paramsRef.current = { heaterGain, heatDecay, buoyancy, cohesion, surfaceTension, count: particleCount, heaterSize, volumeHeight, voxelSize, paused, heater, autoRotate };
  }, [autoRotate, buoyancy, cohesion, heatDecay, heater, heaterGain, heaterSize, particleCount, paused, surfaceTension, volumeHeight, voxelSize]);

  const seed = useCallback((count = paramsRef.current.count, height = paramsRef.current.volumeHeight) => {
    const particles: Particle3D[] = [];
    worldHeightRef.current = clamp(height, VOXEL_RANGES.volumeHeight.min, VOXEL_RANGES.volumeHeight.max);
    for (let index = 0; index < count; index++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * VOLUME_RADIUS * .82;
      particles.push({
        x: Math.cos(angle) * radius,
        y: .035 + Math.random() * worldHeightRef.current * .34,
        z: Math.sin(angle) * radius,
        vx: (Math.random() - .5) * .06,
        vy: (Math.random() - .5) * .06,
        vz: (Math.random() - .5) * .06,
        heat: 0,
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    seed();
    let width = 0;
    let height = 0;
    let last = performance.now();
    let fpsStarted = last;
    let fpsFrames = 0;

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = box.width;
      height = box.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };

    const pointerDown = (event: PointerEvent) => {
      cameraRef.current.dragging = true;
      cameraRef.current.x = event.clientX;
      cameraRef.current.y = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      const camera = cameraRef.current;
      if (!camera.dragging) return;
      const dx = event.clientX - camera.x;
      const dy = event.clientY - camera.y;
      camera.yaw += dx * .008;
      camera.pitch = clamp(camera.pitch + dy * .006, -.72, .72);
      camera.x = event.clientX;
      camera.y = event.clientY;
    };
    const pointerUp = () => { cameraRef.current.dragging = false; };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      cameraRef.current.zoom = clamp(cameraRef.current.zoom * Math.exp(-event.deltaY * .001), .58, 1.85);
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") cameraRef.current.yaw -= .08;
      else if (event.key === "ArrowRight") cameraRef.current.yaw += .08;
      else if (event.key === "ArrowUp") cameraRef.current.pitch = clamp(cameraRef.current.pitch - .06, -.72, .72);
      else if (event.key === "ArrowDown") cameraRef.current.pitch = clamp(cameraRef.current.pitch + .06, -.72, .72);
      else if (event.key === "+" || event.key === "=") cameraRef.current.zoom = clamp(cameraRef.current.zoom * 1.08, .58, 1.85);
      else if (event.key === "-") cameraRef.current.zoom = clamp(cameraRef.current.zoom / 1.08, .58, 1.85);
      else return;
      event.preventDefault();
    };

    const step = (dt: number) => {
      const particles = particlesRef.current;
      const params = paramsRef.current;
      const activeHeight = worldHeightRef.current;
      const ax = new Float32Array(particles.length);
      const ay = new Float32Array(particles.length);
      const az = new Float32Array(particles.length);
      const neighborX = new Float32Array(particles.length);
      const neighborY = new Float32Array(particles.length);
      const neighborZ = new Float32Array(particles.length);
      const neighborCount = new Uint16Array(particles.length);
      const rest = .052;
      const cohesionRange = .155;
      const cellSize = cohesionRange;
      const grid = new Map<string, number[]>();

      particles.forEach((particle, index) => {
        const key = `${Math.floor(particle.x / cellSize)},${Math.floor(particle.y / cellSize)},${Math.floor(particle.z / cellSize)}`;
        const bucket = grid.get(key);
        if (bucket) bucket.push(index); else grid.set(key, [index]);
      });

      for (let index = 0; index < particles.length; index++) {
        const particle = particles[index];
        ay[index] -= .2;
        ax[index] -= particle.vx * .22;
        ay[index] -= particle.vy * .22;
        az[index] -= particle.vz * .22;
        particle.heat *= Math.exp(-params.heatDecay * dt * 10);
        const heaterDistance = particle.x * particle.x + particle.z * particle.z + (particle.y - .045) ** 2;
        const heaterField = Math.exp(-heaterDistance / (.018 * params.heaterSize * params.heaterSize));
        if (params.heater) particle.heat += params.heaterGain * .0008 * heaterField * dt;
        ay[index] += params.buoyancy * .0017 * particle.heat;

        const cellX = Math.floor(particle.x / cellSize);
        const cellY = Math.floor(particle.y / cellSize);
        const cellZ = Math.floor(particle.z / cellSize);
        for (let gx = -1; gx <= 1; gx++) for (let gy = -1; gy <= 1; gy++) for (let gz = -1; gz <= 1; gz++) {
          const bucket = grid.get(`${cellX + gx},${cellY + gy},${cellZ + gz}`);
          if (!bucket) continue;
          for (const otherIndex of bucket) {
            if (otherIndex <= index) continue;
            const other = particles[otherIndex];
            const dx = other.x - particle.x;
            const dy = other.y - particle.y;
            const dz = other.z - particle.z;
            const distanceSquared = dx * dx + dy * dy + dz * dz;
            if (distanceSquared > cohesionRange * cohesionRange || distanceSquared < .0000001) continue;
            const distance = Math.sqrt(distanceSquared);
            const nx = dx / distance;
            const ny = dy / distance;
            const nz = dz / distance;
            const force = distance < rest
              ? -(rest - distance) * 18
              : Math.sin(Math.PI * (distance - rest) / (cohesionRange - rest)) * .09 * params.cohesion;
            ax[index] += nx * force; ay[index] += ny * force; az[index] += nz * force;
            ax[otherIndex] -= nx * force; ay[otherIndex] -= ny * force; az[otherIndex] -= nz * force;
            neighborX[index] += other.x; neighborY[index] += other.y; neighborZ[index] += other.z; neighborCount[index]++;
            neighborX[otherIndex] += particle.x; neighborY[otherIndex] += particle.y; neighborZ[otherIndex] += particle.z; neighborCount[otherIndex]++;
          }
        }
      }

      particles.forEach((particle, index) => {
        const count = neighborCount[index];
        if (count === 0 || count >= 18 || params.surfaceTension === 0) return;
        const boundaryFactor = (18 - count) / 18;
        ax[index] += (neighborX[index] / count - particle.x) * params.surfaceTension * boundaryFactor * 2.2;
        ay[index] += (neighborY[index] / count - particle.y) * params.surfaceTension * boundaryFactor * 2.2;
        az[index] += (neighborZ[index] / count - particle.z) * params.surfaceTension * boundaryFactor * 2.2;
      });

      particles.forEach((particle, index) => {
        particle.vx = clamp((particle.vx + ax[index] * dt) * .992, -.68, .68);
        particle.vy = clamp((particle.vy + ay[index] * dt) * .992, -.68, .68);
        particle.vz = clamp((particle.vz + az[index] * dt) * .992, -.68, .68);
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.z += particle.vz * dt;
        const particleRadius = .014;
        const radialDistance = Math.sqrt(particle.x * particle.x + particle.z * particle.z);
        const radialLimit = VOLUME_RADIUS - particleRadius;
        if (radialDistance > radialLimit) {
          const nx = particle.x / radialDistance;
          const nz = particle.z / radialDistance;
          particle.x = nx * radialLimit;
          particle.z = nz * radialLimit;
          const outwardVelocity = particle.vx * nx + particle.vz * nz;
          if (outwardVelocity > 0) {
            particle.vx -= 1.78 * outwardVelocity * nx;
            particle.vz -= 1.78 * outwardVelocity * nz;
          }
        }
        if (particle.y < particleRadius) { particle.y = particleRadius; particle.vy = Math.abs(particle.vy) * .78; }
        if (particle.y > activeHeight - particleRadius) { particle.y = activeHeight - particleRadius; particle.vy = -Math.abs(particle.vy) * .78; }
      });
    };

    const project = (x: number, y: number, z: number) => {
      const camera = cameraRef.current;
      const activeHeight = worldHeightRef.current;
      const cosYaw = Math.cos(camera.yaw);
      const sinYaw = Math.sin(camera.yaw);
      const cosPitch = Math.cos(camera.pitch);
      const sinPitch = Math.sin(camera.pitch);
      const rotatedX = x * cosYaw - z * sinYaw;
      const yawDepth = x * sinYaw + z * cosYaw;
      const centeredY = y - activeHeight / 2;
      const rotatedY = centeredY * cosPitch - yawDepth * sinPitch;
      const depth = centeredY * sinPitch + yawDepth * cosPitch;
      const perspective = 2.8 / (3.15 + depth);
      const scale = Math.min(width * .72, height * .76) / Math.max(1.15, activeHeight) * camera.zoom;
      return { x: width / 2 + rotatedX * scale * perspective, y: height / 2 - rotatedY * scale * perspective, depth, perspective };
    };

    const drawCylinder = () => {
      const activeHeight = worldHeightRef.current;
      ctx.strokeStyle = "rgba(32,215,215,.28)";
      ctx.lineWidth = 1;
      for (const y of [0, activeHeight]) {
        ctx.beginPath();
        for (let index = 0; index <= 32; index++) {
          const angle = index / 32 * Math.PI * 2;
          const point = project(Math.cos(angle) * VOLUME_RADIUS, y, Math.sin(angle) * VOLUME_RADIUS);
          if (index === 0) ctx.moveTo(Math.round(point.x) + .5, Math.round(point.y) + .5);
          else ctx.lineTo(Math.round(point.x) + .5, Math.round(point.y) + .5);
        }
        ctx.stroke();
      }
      for (let index = 0; index < 12; index++) {
        const angle = index / 12 * Math.PI * 2;
        const bottom = project(Math.cos(angle) * VOLUME_RADIUS, 0, Math.sin(angle) * VOLUME_RADIUS);
        const top = project(Math.cos(angle) * VOLUME_RADIUS, activeHeight, Math.sin(angle) * VOLUME_RADIUS);
        ctx.beginPath();
        ctx.moveTo(Math.round(bottom.x) + .5, Math.round(bottom.y) + .5);
        ctx.lineTo(Math.round(top.x) + .5, Math.round(top.y) + .5);
        ctx.stroke();
      }
    };

    const draw = (now: number) => {
      const dt = Math.min(.026, (now - last) / 1000 || .016);
      last = now;
      const params = paramsRef.current;
      if (params.autoRotate && !cameraRef.current.dragging) cameraRef.current.yaw += dt * .11;
      if (!params.paused) {
        step(dt);
        step(dt);
      }

      ctx.fillStyle = "#070b12";
      ctx.fillRect(0, 0, width, height);
      const backgroundGradient = ctx.createRadialGradient(width * .5, height * .55, 0, width * .5, height * .55, Math.max(width, height) * .62);
      backgroundGradient.addColorStop(0, "rgba(93,31,103,.42)");
      backgroundGradient.addColorStop(.58, "rgba(20,18,31,.16)");
      backgroundGradient.addColorStop(1, "rgba(7,11,18,0)");
      ctx.fillStyle = backgroundGradient;
      ctx.fillRect(0, 0, width, height);
      drawCylinder();

      if (params.heater) {
        for (let ring = 0; ring < 7; ring++) {
          const radius = (ring + 1) / 7 * VOLUME_RADIUS * params.heaterSize;
          for (let index = 0; index < 22; index++) {
            const angle = index / 22 * Math.PI * 2;
            const point = project(Math.cos(angle) * radius, .012, Math.sin(angle) * radius);
            const alpha = .48 * (1 - ring / 7);
            ctx.fillStyle = `rgba(247,231,0,${alpha})`;
            ctx.fillRect(Math.round(point.x) - 1, Math.round(point.y) - 1, 3, 3);
          }
        }
      }

      const projected = particlesRef.current.map((particle) => ({ particle, point: project(particle.x, particle.y, particle.z) }));
      projected.sort((a, b) => b.point.depth - a.point.depth);
      const countScale = Math.sqrt(180 / Math.max(60, particlesRef.current.length));
      for (const { particle, point } of projected) {
        const heat = clamp(particle.heat / .42, 0, 1);
        const cold = { r: 32, g: 215, b: 215 };
        const warm = { r: 214, g: 107, b: 61 };
        const hot = { r: 247, g: 231, b: 0 };
        const firstMix = Math.min(1, heat * 1.45);
        const hotMix = Math.max(0, (heat - .68) / .32);
        const baseR = cold.r * (1 - firstMix) + warm.r * firstMix;
        const baseG = cold.g * (1 - firstMix) + warm.g * firstMix;
        const baseB = cold.b * (1 - firstMix) + warm.b * firstMix;
        const red = Math.round(baseR * (1 - hotMix) + hot.r * hotMix);
        const green = Math.round(baseG * (1 - hotMix) + hot.g * hotMix);
        const blue = Math.round(baseB * (1 - hotMix) + hot.b * hotMix);
        const size = Math.max(2, Math.min(12, Math.round(params.voxelSize * point.perspective * countScale)));
        const x = Math.round(point.x - size / 2);
        const y = Math.round(point.y - size / 2);
        ctx.fillStyle = `rgba(${red},${green},${blue},.84)`;
        ctx.fillRect(x, y, size, size);
        if (size >= 4) {
          ctx.fillStyle = `rgba(255,255,255,.28)`;
          ctx.fillRect(x, y, size, 1);
          ctx.fillStyle = "rgba(0,0,0,.26)";
          ctx.fillRect(x + size - 1, y + 1, 1, size - 1);
        }
      }

      fpsFrames++;
      if (now - fpsStarted > 800) {
        setFps(Math.round(fpsFrames * 1000 / (now - fpsStarted)));
        fpsFrames = 0;
        fpsStarted = now;
      }
      frameRef.current = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);
    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("keydown", keyDown);
    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("keydown", keyDown);
    };
  }, [seed]);

  const updateCount = (value: number) => {
    const next = clamp(Math.round(value), 30, 1200);
    setParticleCount(next);
    paramsRef.current.count = next;
  };

  const resetVolume = () => {
    const nextHeight = clamp(volumeHeight, VOXEL_RANGES.volumeHeight.min, VOXEL_RANGES.volumeHeight.max);
    setActiveCount(particleCount);
    setActiveHeight(nextHeight);
    seed(particleCount, nextHeight);
  };

  return (
    <section className="voxel-lab">
      <div className="voxel-stage">
        <canvas ref={canvasRef} className="voxel-canvas" tabIndex={0} aria-label="Interactive three-dimensional voxel lava volume. Drag to orbit and scroll to zoom." />
        <div className="voxel-readout" aria-live="polite"><span>3-D PARTICLES <b>{activeCount}</b></span><span>FPS <b>{fps}</b></span><span>DEPTH <b>{activeHeight.toFixed(3)}</b></span></div>
        <div className="voxel-orbit-hint"><b>DRAG</b> ORBIT · <b>SCROLL</b> ZOOM</div>
      </div>
      <aside className="voxel-controls">
        <div className="voxel-console-head"><span className="control-label">Volumetric fluid console</span><b>XYZ / VOXEL</b></div>
        <ExpControl label="Heater gain" value={heaterGain} range={VOXEL_RANGES.heaterGain} manualMax={1000} places={1} onChange={setHeaterGain} />
        <ExpControl label="Heat decay" value={heatDecay} range={VOXEL_RANGES.heatDecay} manualMax={10} places={5} onChange={setHeatDecay} />
        <ExpControl label="Buoyancy" value={buoyancy} range={VOXEL_RANGES.buoyancy} manualMax={10000} places={0} onChange={setBuoyancy} />
        <ExpControl label="Cohesion strength" value={cohesion} range={VOXEL_RANGES.cohesion} manualMax={20} places={3} onChange={setCohesion} />
        <ExpControl label="Surface tension" value={surfaceTension} range={VOXEL_RANGES.surfaceTension} manualMax={20} places={3} onChange={setSurfaceTension} />
        <div className="voxel-slider">
          <label><span>Particles · reset</span><input aria-label="Enter 3-D particle count" type="number" min="30" max="1200" step="10" value={particleCount} onChange={(event) => updateCount(Number(event.target.value))} /></label>
          <input aria-label="Adjust 3-D particle count exponentially" type="range" min="0" max={SLIDER_STEPS} step="1" value={toExponentialPosition(particleCount, VOXEL_RANGES.count)} onChange={(event) => updateCount(Math.round(fromExponentialPosition(Number(event.target.value), VOXEL_RANGES.count) / 10) * 10)} />
        </div>
        <ExpControl label="Heater size" value={heaterSize} range={VOXEL_RANGES.heaterSize} manualMax={2} places={3} onChange={setHeaterSize} />
        <ExpControl label="Volume height · reset" value={volumeHeight} range={VOXEL_RANGES.volumeHeight} manualMax={3} places={3} onChange={setVolumeHeight} />
        <div className="voxel-slider">
          <label><span>Voxel size</span><input aria-label="Enter voxel size" type="number" min="2" max="12" step="1" value={voxelSize} onChange={(event) => setVoxelSize(clamp(Number(event.target.value), 2, 12))} /></label>
          <input aria-label="Adjust voxel size" type="range" min="2" max="12" step="1" value={voxelSize} onChange={(event) => setVoxelSize(Number(event.target.value))} />
        </div>
        <div className="voxel-toggle-row">
          <button className={autoRotate ? "active" : ""} onClick={() => setAutoRotate((value) => !value)}>Auto orbit</button>
          <button onClick={() => { cameraRef.current.yaw = -.62; cameraRef.current.pitch = .22; cameraRef.current.zoom = 1; }}>Reset view</button>
        </div>
        <div className="transport voxel-transport">
          <button onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</button>
          <button onClick={() => setHeater((value) => !value)}>{heater ? "Heater off" : "Heater on"}</button>
          <button onClick={resetVolume}>Reset volume</button>
        </div>
        <p className="voxel-note">This first pass extends the 2-D forces into a cylindrical three-dimensional neighborhood. The rendering remains deliberately blocky; higher particle counts trade frame rate for denser fluid structure.</p>
      </aside>
    </section>
  );
}
