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
  const danceTimer = useRef<number | null>(null);
  const extensionTimer = useRef<number | null>(null);
  const [gag, setGag] = useState("");
  const [gagLabel, setGagLabel] = useState("");
  const [randomColor, setRandomColor] = useState("");
  const [dance, setDance] = useState("");
  const [dancePick, setDancePick] = useState(0);
  const [danceDx, setDanceDx] = useState(80);
  const [extensions, setExtensions] = useState([0,0,0,0,0]);
  const [youAreHereCount, setYouAreHereCount] = useState<number | null>(null);

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
    if (kind === "slidefall") {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1050, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(68, ctx.currentTime + 1.35);
      gain.gain.setValueAtTime(.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.15, ctx.currentTime + .025);
      gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + 1.45);
      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + 1.48);
      window.setTimeout(() => void ctx.close(), 1750);
      return;
    }
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
      { id: "fall", weight: 2.2, sound: "slidefall", label: "GRAVITY ENABLED" },
      { id: "explode", weight: 1.5, sound: "laser", label: "BUTTON FAILURE" },
      { id: "rgb", weight: 4.5, sound: "sparkle", label: "LOCAL COLOR SPACE MUTATION" },
      { id: "matrix", weight: 2.2, sound: "laser", label: "TECHNOLOGY DETECTED" },
      { id: "oblivion", weight: 1.8, sound: "spring", label: "RECEDING FROM VIEW" },
      { id: "spaghettify", weight: 1.25, sound: "spring", label: "EXTREME TIDAL FORCE" },
      { id: "crumple", weight: 1.15, sound: "bonk", label: "DOCUMENT COMPRESSION" },
      { id: "where-else", weight: 7, sound: "bonk", label: "WHERE ELSE?" },
      { id: "wherever", weight: 5, sound: "sparkle", label: "WHEREVER YOU GO, THERE YOU ARE" },
      { id: "powerpoint", weight: 2.6, sound: "laser", label: "SLIDE TRANSITION" },
      { id: "shuffle", weight: 2.2, sound: "sparkle", label: "PLEASE HOLD WHILE WE REORDER REALITY" },
      { id: "stairs", weight: 1.65, sound: "spring", label: "WATCH YOUR STEP" },
      { id: "trickle", weight: 2.8, sound: "spring", label: "CASCADE IN PROGRESS" },
      { id: "handwave", weight: 1.1, sound: "sparkle", label: "HELLO." },
      { id: "vanish-lines", weight: 1.45, sound: "laser", label: "DIMENSIONAL COLLAPSE" },
      { id: "bite", weight: 1.2, sound: "bonk", label: "WE'RE GONNA NEED A BIGGER BUTTON" },
      { id: "balloon", weight: 1.05, sound: "spring", label: "CAPACITY EXCEEDED" },
      { id: "closing-time", weight: 4.5, sound: "bonk", label: "YOU DON'T HAVE TO GO HOME, BUT YOU CAN'T STAY HERE!" },
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
    setDance("");
    setGag(choice.id);
    setGagLabel(choice.label);
    if (choice.id === "rgb") {
      const bytes = crypto.getRandomValues(new Uint8Array(3));
      setRandomColor(`rgb(${bytes[0]} ${bytes[1]} ${bytes[2]})`);
    }
    if (choice.id === "random") {
      const destinations = ["/compendium", "/music", "/gallery", "/research", "/gallery/gravity", "/gallery/lava-lamp", "/gallery/nonlinear-deq", "/gallery/moire", "/gallery/lissajous", "/gallery/catenary"];
      const target = destinations[Math.floor(random * destinations.length)];
      timer.current = window.setTimeout(() => { window.location.assign(target); }, 850);
    } else {
      const duration = choice.id === "upside" ? 2600 : choice.id === "fall" ? 2200 : ["matrix","spaghettify","crumple","shuffle","stairs","handwave","vanish-lines","bite","balloon"].includes(choice.id) ? 2400 : choice.id === "oblivion" ? 1800 : 1150;
      timer.current = window.setTimeout(() => { setGag(""); setGagLabel(""); setRandomColor(""); }, duration);
    }
  }, [synth]);

  const recordYouAreHerePress = useCallback(() => {
    void fetch("/api/you-are-here-count", { method: "POST" })
      .then((response) => {
        if (!response.ok) throw new Error("Counter unavailable");
        return response.json() as Promise<{ count?: unknown }>;
      })
      .then(({ count }) => {
        if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) return;
        setYouAreHereCount((current) => current === null ? count : Math.max(current, count));
      })
      .catch(() => {});
  }, []);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/you-are-here-count", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Counter unavailable");
        return response.json() as Promise<{ count?: unknown }>;
      })
      .then(({ count }) => {
        if (typeof count === "number" && Number.isSafeInteger(count) && count >= 0) {
          setYouAreHereCount(count);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const dances = ["ripple-x","ripple-y","trickle","cradle","fan","accordion","bobble","shake-one","drift-one","shoot-one","height-focus"];
    const schedule = () => {
      danceTimer.current = window.setTimeout(() => {
        const random = crypto.getRandomValues(new Uint32Array(3));
        const next = dances[random[0] % dances.length];
        setDancePick(random[1] % rooms.length);
        setDanceDx(45 + random[2] % 150);
        setDance(next);
        playWoosh();
        window.setTimeout(() => setDance(""), next === "shoot-one" ? 1900 : 1250);
        schedule();
      }, 6500 + Math.random() * 9000);
    };
    schedule();
    return () => { if (danceTimer.current) window.clearTimeout(danceTimer.current); };
  }, [playWoosh]);

  useEffect(() => {
    const scheduleExtensions = () => {
      extensionTimer.current = window.setTimeout(() => {
        const count = 1 + Math.floor(Math.random() * 4);
        const order = rooms.map((_,i)=>i).sort(()=>Math.random()-.5);
        const next = [0,0,0,0,0];
        order.slice(0,count).forEach(i => next[i] = 35 + Math.floor(Math.random()*145));
        setExtensions(next);
        playWoosh();
        window.setTimeout(() => setExtensions([0,0,0,0,0]), 2600);
        scheduleExtensions();
      }, 7500 + Math.random()*7500);
    };
    scheduleExtensions();
    return () => {
      if (extensionTimer.current) window.clearTimeout(extensionTimer.current);
    };
  }, [playWoosh]);

  return (
    <main className={`index-shell cotm-gag cotm-gag-${gag || "idle"}`} style={randomColor ? {"--gag-rgb":randomColor} as React.CSSProperties : undefined}>
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
      <nav className={`index-nav menu-dance menu-dance-${gag ? "idle" : (dance || "idle")}`} aria-label="Main collection">
        {rooms.map((room, index) => (
          <Link
            key={room.id}
            href={room.href}
            className={`color-line ${room.color} ${active === room.id ? "is-active" : ""} ${room.id === "home" ? "you-are-here" : ""} ${dancePick === index ? "dance-picked" : ""} ${!gag && extensions[index] ? "menu-extended" : ""}`}
            style={{"--i":index,"--dance-dx":`${danceDx}px`,"--extend":`${gag ? 0 : extensions[index]}px`} as React.CSSProperties}
            onPointerEnter={playWoosh}
            onClick={room.id === "home" ? (event) => {
              event.preventDefault();
              recordYouAreHerePress();
              summonGag();
            } : undefined}
            aria-current={active === room.id ? "page" : undefined}
          >
            <span className="color-line-label">
              {room.label}
              {room.id === "home" && (
                <small className="you-are-here-count" aria-live="polite">
                  {youAreHereCount === null
                    ? "counting presses..."
                    : `${youAreHereCount.toLocaleString()} ${youAreHereCount === 1 ? "press" : "presses"} so far`}
                </small>
              )}
            </span>
          </Link>
        ))}
      </nav>
      {gagLabel && <div className="gag-caption" aria-live="polite">{gagLabel}</div>}
      {gag === "explode" && <div className="gag-debris" aria-hidden="true">{Array.from({ length: 26 }, (_, i) => <i key={i} style={{ "--i": i } as React.CSSProperties} />)}</div>}
      {gag === "matrix" && <div className="gag-matrix" aria-hidden="true">{Array.from({length:28},(_,i)=><i key={i} style={{"--i":i} as React.CSSProperties}>{"01⌬Ψλ∆∷⌁101Ξµ∴Φ⊕⟟0101".repeat(3)}</i>)}</div>}
      {gag === "powerpoint" && <div className="gag-powerpoint" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{"--i":i} as React.CSSProperties}/>)}</div>}
      {gag === "stairs" && <div className="gag-stair-dot" aria-hidden="true"/>}
      {gag === "balloon" && <div className="gag-confetti" aria-hidden="true">{Array.from({length:42},(_,i)=><i key={i} style={{"--i":i} as React.CSSProperties}/>)}</div>}
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
