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

  const playWoosh = useCallback(() => {
    if (!audio.current) audio.current = new Audio("/woosh.wav");
    audio.current.currentTime = 0;
    void audio.current.play().catch(() => {});
  }, []);

  return (
    <main className="index-shell">
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
            className={`color-line ${room.color} ${active === room.id ? "is-active" : ""}`}
            onPointerEnter={playWoosh}
            aria-current={active === room.id ? "page" : undefined}
          >
            <span>{room.label}</span>
          </Link>
        ))}
      </nav>
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
