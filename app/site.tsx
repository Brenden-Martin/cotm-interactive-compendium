"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Room = "home" | "compendium" | "music" | "gallery" | "research";

const rooms: Array<{ id: Room; label: string; href: string; color: string }> = [
  { id: "compendium", label: "The Compendium", href: "/compendium", color: "red" },
  { id: "music", label: "Music", href: "/music", color: "orange" },
  { id: "gallery", label: "Gallery", href: "/gallery", color: "green" },
  { id: "research", label: "Private Research", href: "/research", color: "blue" },
  { id: "home", label: "You Are Here", href: "/", color: "purple" },
];

export function ColorIndex({ active }: { active: Room }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const recentGags = useRef<string[]>([]);
  const timer = useRef<number | null>(null);
  const [gag, setGag] = useState("");
  const [gagLabel, setGagLabel] = useState("");

  const playWoosh = useCallback(() => {
    if (!audio.current) audio.current = new Audio("/woosh.wav");
    audio.current.currentTime = 0;
    void audio.current.play().catch(() => {});
  }, []);

  const synth = useCallback((kind: string) => {
    const AudioContextClass = window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.16, ctx.currentTime + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .5);
    const notes =
      kind === "bonk" ? [155, 72] :
      kind === "laser" ? [920, 110] :
      kind === "spring" ? [110, 640, 150] :
      kind === "error" ? [180, 180, 130] :
      kind === "sparkle" ? [523, 659, 784] :
      [240, 330];
    notes.forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      osc.type = kind === "laser" ? "sawtooth" : kind === "bonk" ? "square" : "sine";
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + index * .075);
      if (kind === "spring") osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * .65), ctx.currentTime + index * .075 + .18);
      osc.connect(gain);
      osc.start(ctx.currentTime + index * .075);
      osc.stop(ctx.currentTime + index * .075 + .22);
    });
    window.setTimeout(() => void ctx.close(), 850);
  }, []);

  const summonGag = useCallback(() => {
    const choices = [
      { id: "sound-bonk", weight: 18, sound: "bonk", label: "BONK." },
      { id: "sound-laser", weight: 15, sound: "laser", label: "PEW." },
      { id: "sound-spring", weight: 14, sound: "spring", label: "BOYOYOING." },
      { id: "sound-sparkle", weight: 12, sound: "sparkle", label: "AUSPICIOUS." },
      { id: "shake", weight: 8, sound: "bonk", label: "LOCAL TREMOR" },
      { id: "squish", weight: 7, sound: "spring", label: "COMPRESSED" },
      { id: "blink", weight: 6, sound: "error", label: "PLEASE STAND BY" },
      { id: "hue", weight: 5, sound: "sparkle", label: "CHROMATIC INCIDENT" },
      { id: "invert", weight: 4, sound: "laser", label: "POLARITY REVERSED" },
      { id: "mirage", weight: 3.5, sound: "spring", label: "HEAT HAZE" },
      { id: "upside", weight: 2.5, sound: "bonk", label: "SOUTH IS UP" },
      { id: "fall", weight: 2.2, sound: "spring", label: "GRAVITY ENABLED" },
      { id: "explode", weight: 1.5, sound: "laser", label: "BUTTON FAILURE" },
      { id: "random", weight: .8, sound: "sparkle", label: "WRONG TURN" },
    ];
    const eligible = choices.map(choice => ({
      ...choice,
      adjusted: recentGags.current.includes(choice.id) ? choice.weight * .12 : choice.weight,
    }));
    const total = eligible.reduce((sum, choice) => sum + choice.adjusted, 0);
    const random = crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
    let cursor = random * total;
    const choice = eligible.find(item => (cursor -= item.adjusted) <= 0) ?? eligible[0];
    recentGags.current = [...recentGags.current.slice(-3), choice.id];
    synth(choice.sound);
    if (timer.current) window.clearTimeout(timer.current);
    setGag(choice.id);
    setGagLabel(choice.label);
    if (choice.id === "random") {
      const destinations = ["/compendium", "/music", "/gallery", "/research", "/gallery/gravity", "/gallery/lava-lamp", "/gallery/nonlinear-deq", "/gallery/moire", "/gallery/lissajous", "/gallery/catenary"];
      const target = destinations[Math.floor(random * destinations.length)];
      timer.current = window.setTimeout(() => { window.location.assign(target); }, 850);
    } else {
      const duration = choice.id === "upside" ? 2600 : choice.id === "fall" ? 2200 : 1150;
      timer.current = window.setTimeout(() => { setGag(""); setGagLabel(""); }, duration);
    }
  }, [synth]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  return (
    <main className={`index-shell cotm-gag cotm-gag-${gag || "idle"}`}>
      <section className="index-aside">
        <div>
          <div className="eyebrow">Child of the Machine · Est. 2023</div>
          <h1 className="brand">COTM</h1>
        </div>
        <p className="intro">
          Child of the Machine is an evolving cabinet of interactive exhibits:
          sound, visual systems, private experiments, and whatever refuses to
          fit neatly elsewhere.
        </p>
      </section>
      <nav className="index-nav" aria-label="Main collection">
        {rooms.map((room) => (
          <Link
            key={room.id}
            href={room.href}
            className={`color-line ${room.color} ${active === room.id ? "is-active" : ""} ${room.id === "home" ? "you-are-here" : ""}`}
            onPointerEnter={playWoosh}
            onClick={room.id === "home" ? (event) => { event.preventDefault(); summonGag(); } : undefined}
            aria-current={active === room.id ? "page" : undefined}
          >
            <span>{room.label}</span>
          </Link>
        ))}
      </nav>
      {gagLabel && <div className="gag-caption" aria-live="polite">{gagLabel}</div>}
      {gag === "explode" && <div className="gag-debris" aria-hidden="true">{Array.from({ length: 26 }, (_, i) => <i key={i} style={{ "--i": i } as React.CSSProperties} />)}</div>}
    </main>
  );
}

export function ToneBoard() {
  const [playing, setPlaying] = useState<number | null>(null);

  const play = (index: number) => {
    const AudioContextClass = window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = ["sine", "triangle", "square", "sawtooth"][index] as OscillatorType;
    oscillator.frequency.value = [196, 261.63, 329.63, 392][index];
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.62);
    setPlaying(index);
    window.setTimeout(() => setPlaying(null), 620);
  };

  return (
    <div className="music-grid">
      {["LOW", "ROUND", "BRIGHT", "WIRE"].map((name, index) => (
        <button
          type="button"
          key={name}
          className={`tone ${playing === index ? "playing" : ""}`}
          onClick={() => play(index)}
          aria-label={`Play ${name.toLowerCase()} tone`}
        >
          <b>0{index + 1}</b><span>{name}<br />tap to listen</span>
        </button>
      ))}
    </div>
  );
}

export function Pendulum() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0, height = 0, frame = 0, dragging = false;
    let angle = Math.PI / 4, velocity = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const origin = () => ({ x: width / 2, y: Math.max(110, height * .23) });
    const length = () => Math.min(280, height * .36, width * .38);
    const bob = () => {
      const o = origin(), len = length();
      return { x: o.x + len * Math.sin(angle), y: o.y + len * Math.cos(angle) };
    };
    const move = (event: PointerEvent) => {
      if (!dragging) return;
      const o = origin();
      angle = Math.atan2(event.clientX - o.x, event.clientY - o.y);
      velocity = 0;
    };
    const down = (event: PointerEvent) => {
      const b = bob();
      if (Math.hypot(event.clientX - b.x, event.clientY - b.y) < 54) {
        dragging = true;
        canvas.setPointerCapture(event.pointerId);
      }
    };
    const up = () => { dragging = false; };
    const draw = () => {
      if (!dragging) {
        velocity += (-0.006 * Math.sin(angle));
        velocity *= .995;
        angle += velocity;
      }
      ctx.clearRect(0, 0, width, height);
      const o = origin(), b = bob();
      ctx.beginPath();
      ctx.arc(o.x, o.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#151515";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(o.x, o.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#151515";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(b.x, b.y, 36, 0, Math.PI * 2);
      ctx.fillStyle = "#3989d2";
      ctx.fill();
      frame = requestAnimationFrame(draw);
    };
    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    draw();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    };
  }, []);

  return <canvas ref={canvasRef} className="pendulum-canvas" aria-label="Interactive blue pendulum; drag the ball to reposition it" />;
}
