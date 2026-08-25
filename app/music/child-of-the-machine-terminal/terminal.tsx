"use client";

/* eslint-disable @next/next/no-img-element -- original user-supplied poster line art */
import { useCallback, useEffect, useRef, useState } from "react";

const mainKeys = [
  "ESC", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "DEL",
  "TAB", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "RETURN",
  "SHIFT", "A", "S", "D", "F", "G", "H", "J", "K", "L", "SPACE",
];
const padKeys = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", "0", ".", "+"];
const OUTERNET_PASSWORD = "HELLO WORLD";

function scatterStyle(index: number, total: number) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const distance = 58 + (index * 17) % 48;
  return {
    "--scatter-x": `${Math.cos(angle) * distance}vw`,
    "--scatter-y": `${Math.sin(angle) * distance}vh`,
    "--scatter-spin": `${-540 + (index * 137) % 1080}deg`,
    "--scatter-scale": `${2.2 + (index % 7) * .42}`,
    "--scatter-delay": `${(index % 13) * 11}ms`,
  } as React.CSSProperties;
}

export function ChildMachineTerminal() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const chaosTimerRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const typedRef = useRef("");
  const enteringRef = useRef(false);
  const [power, setPower] = useState(true);
  const [activeKey, setActiveKey] = useState("");
  const [glitch, setGlitch] = useState(0);
  const [tone, setTone] = useState(46);
  const [noise, setNoise] = useState(34);
  const [falling, setFalling] = useState(false);
  const [fallCycle, setFallCycle] = useState(0);
  const [typedBuffer, setTypedBuffer] = useState("");
  const [entering, setEntering] = useState(false);
  const [entryRect, setEntryRect] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [chaos, setChaos] = useState({ effect: 0, spin: 0, scale: 1, x: 0, y: 0, skew: 0, codeX: 0, codeY: 0, codeTilt: 0, duration: 700 });

  const beginOuternet = useCallback(() => {
    if (enteringRef.current) return;
    enteringRef.current = true;
    const rect = screenRef.current?.getBoundingClientRect();
    setEntryRect(rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight });
    setEntering(true);
    document.body.style.overflow = "hidden";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    transitionTimerRef.current = window.setTimeout(() => window.location.assign("/the-outernet"), reducedMotion ? 900 : 3600);
  }, []);

  const recordKey = useCallback((key: string) => {
    if (enteringRef.current) return;
    let next = typedRef.current;
    if (key === "DEL") next = next.slice(0, -1);
    else if (key === "ESC" || key === "RETURN") next = "";
    else if (key === "SPACE") next += " ";
    else if (/^[A-Z0-9]$/.test(key)) next += key;
    next = next.replace(/\s+/g, " ").slice(-28);
    typedRef.current = next;
    setTypedBuffer(next);
    if (next.endsWith(OUTERNET_PASSWORD)) beginOuternet();
  }, [beginOuternet]);

  const playKey = useCallback((key: string, index: number) => {
    setActiveKey(`${key}-${index}`);
    window.setTimeout(() => setActiveKey(""), 130);
    if (!power) return;
    recordKey(key);
    if (key === "SPACE") {
      setFalling((value) => !value);
      setFallCycle((value) => value + 1);
    }
    const duration = 520 + Math.floor(Math.random() * 980);
    setGlitch(1 + Math.floor(Math.random() * 6));
    setChaos({
      effect: 1 + Math.floor(Math.random() * 8),
      spin: -540 + Math.random() * 1080,
      scale: .25 + Math.random() * 1.75,
      x: -42 + Math.random() * 84,
      y: -30 + Math.random() * 60,
      skew: -28 + Math.random() * 56,
      codeX: -18 + Math.random() * 36,
      codeY: -14 + Math.random() * 28,
      codeTilt: -5 + Math.random() * 10,
      duration,
    });
    if (chaosTimerRef.current) window.clearTimeout(chaosTimerRef.current);
    chaosTimerRef.current = window.setTimeout(() => {
      setGlitch(0);
      setChaos((value) => ({ ...value, effect: 0 }));
    }, duration);

    const AudioContextClass = window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = context;
    void context.resume();
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = index % 3 === 0 ? "square" : index % 3 === 1 ? "sawtooth" : "triangle";
    oscillator.frequency.setValueAtTime(55 + tone * 4 + (index % 12) * 17, now);
    oscillator.frequency.exponentialRampToValueAtTime(35 + tone * 1.4, now + .09 + (index % 5) * .018);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.015 + noise / 2400, now + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .12 + (index % 4) * .025);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + .24);

    if (index % 4 === 0) {
      const buffer = context.createBuffer(1, Math.floor(context.sampleRate * .055), context.sampleRate);
      const data = buffer.getChannelData(0);
      let noiseState = ((index + 1) * 2654435761) >>> 0;
      for (let sample = 0; sample < data.length; sample += 1) {
        noiseState ^= noiseState << 13;
        noiseState ^= noiseState >>> 17;
        noiseState ^= noiseState << 5;
        data[sample] = (((noiseState >>> 0) / 4294967296) * 2 - 1) * (1 - sample / data.length);
      }
      const source = context.createBufferSource();
      const noiseGain = context.createGain();
      source.buffer = buffer;
      noiseGain.gain.value = noise / 3400;
      source.connect(noiseGain).connect(context.destination);
      source.start(now);
    }
  }, [noise, power, recordKey, tone]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, select, textarea, button")) return;
      if (event.code === "Space") {
        event.preventDefault();
        playKey("SPACE", mainKeys.indexOf("SPACE"));
        return;
      }
      const label = event.key.toUpperCase();
      const normalized = label === "ENTER" ? "RETURN" : label === "BACKSPACE" ? "DEL" : label;
      const mainIndex = mainKeys.indexOf(normalized);
      if (mainIndex >= 0) playKey(mainKeys[mainIndex], mainIndex);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (chaosTimerRef.current) window.clearTimeout(chaosTimerRef.current);
      if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
      document.body.style.overflow = "";
    };
  }, [playKey]);

  const codeBlocks = Array.from({ length: 54 }, (_, index) => (
    <i key={index} style={{
      width: `${10 + ((index * 29) % 70)}px`,
      opacity: .18 + ((index * 17) % 65) / 100,
      "--wave-x": `${3 + ((index * 13) % 15)}px`,
      "--wave-speed": `${1.7 + ((index * 19) % 31) / 10}s`,
      "--wave-delay": `${-((index * 23) % 47) / 10}s`,
    } as React.CSSProperties} />
  ));

  const chaosStyle = {
    "--faller-spin": `${chaos.spin}deg`,
    "--faller-scale": chaos.scale,
    "--faller-x": `${chaos.x}%`,
    "--faller-y": `${chaos.y}%`,
    "--faller-skew": `${chaos.skew}deg`,
    "--code-chaos-x": `${chaos.codeX}%`,
    "--code-chaos-y": `${chaos.codeY}%`,
    "--code-chaos-tilt": `${chaos.codeTilt}deg`,
    "--chaos-duration": `${chaos.duration}ms`,
  } as React.CSSProperties;

  return <>
    <section style={chaosStyle} className={`poster-computer glitch-${glitch} chaos-${chaos.effect}${chaos.effect ? " has-chaos" : ""}${power ? " is-powered" : " is-off"}${entering ? " is-entering-outernet" : ""}`} aria-label="Interactive Child of the Machine computer">
      <div className="poster-monitor">
        <div className="poster-screen" ref={screenRef} aria-live="polite">
          <div className="terminal-code" aria-hidden="true">{codeBlocks}</div>
          <div className={`terminal-faller${falling ? " is-falling" : ""}`} key={fallCycle} aria-hidden="true">
            <img src="/music/child-of-the-machine-terminal/falling-man-original-cutout.png" alt="" />
          </div>
          <span className="terminal-command-buffer" aria-hidden="true">{typedBuffer || "\u00a0"}<i /></span>
          <span className="sr-only">{power ? glitch ? "The display glitches and the falling figure shifts." : "The display is running." : "The display is powered off."}</span>
        </div>
      </div>
      <div className="poster-console">
        <div className="poster-controls">
          <button className="poster-power" type="button" aria-pressed={power} onClick={() => setPower((value) => !value)}><span>I</span><span>O</span></button>
          <div className="poster-vents" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} />)}</div>
          <label className="poster-slider"><span>Tone</span><input type="range" min="0" max="100" value={tone} onChange={(event) => setTone(Number(event.target.value))} /></label>
          <label className="poster-slider"><span>Noise</span><input type="range" min="0" max="100" value={noise} onChange={(event) => setNoise(Number(event.target.value))} /></label>
        </div>
        <div className="poster-keyboard">
          <div className="poster-main-keys">
            {mainKeys.map((key, index) => (
              <button type="button" style={scatterStyle(index, mainKeys.length + padKeys.length)} className={`${key === "SPACE" ? "is-space" : ""}${activeKey === `${key}-${index}` ? " is-active" : ""}`} key={`${key}-${index}`} aria-label={`${key} glitch key`} onClick={() => playKey(key, index)}><span>{key.length <= 2 ? key : ""}</span></button>
            ))}
          </div>
          <div className="poster-pad">
            {padKeys.map((key, index) => <button type="button" style={scatterStyle(index + mainKeys.length, mainKeys.length + padKeys.length)} key={`${key}-${index}`} aria-label={`Number pad ${key} glitch key`} onClick={() => playKey(key, index + mainKeys.length)}>{key}</button>)}
          </div>
        </div>
      </div>
      <p className="terminal-instruction">POWER · SLIDERS · KEYS / SPACE toggles the fall / sound begins only when you touch the machine</p>
    </section>
    {entering && <div className="outernet-terminal-transition" style={{
      "--entry-left": `${entryRect.left}px`,
      "--entry-top": `${entryRect.top}px`,
      "--entry-width": `${entryRect.width}px`,
      "--entry-height": `${entryRect.height}px`,
    } as React.CSSProperties} role="status" aria-label="The terminal is opening The Outernet">
      <div className="outernet-terminal-code" aria-hidden="true">{codeBlocks}</div>
      <div className="outernet-terminal-faller" aria-hidden="true"><img src="/music/child-of-the-machine-terminal/falling-man-original-cutout.png" alt="" /></div>
    </div>}
  </>;
}
