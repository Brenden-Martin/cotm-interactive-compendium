"use client";

import { useRef, useState } from "react";

const mainKeys = [
  "ESC", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "DEL",
  "TAB", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "RETURN",
  "SHIFT", "A", "S", "D", "F", "G", "H", "J", "K", "L", "SPACE",
];
const padKeys = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", "0", ".", "+"];

export function ChildMachineTerminal() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [power, setPower] = useState(true);
  const [activeKey, setActiveKey] = useState("");
  const [glitch, setGlitch] = useState(0);
  const [tone, setTone] = useState(46);
  const [noise, setNoise] = useState(34);

  const playKey = (key: string, index: number) => {
    setActiveKey(`${key}-${index}`);
    window.setTimeout(() => setActiveKey(""), 130);
    if (!power) return;
    setGlitch((index % 6) + 1);
    window.setTimeout(() => setGlitch(0), 440 + (index % 4) * 120);

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
  };

  const codeBlocks = Array.from({ length: 54 }, (_, index) => (
    <i key={index} style={{ width: `${10 + ((index * 29) % 70)}px`, opacity: .18 + ((index * 17) % 65) / 100 }} />
  ));

  return (
    <section className={`poster-computer glitch-${glitch}${power ? " is-powered" : " is-off"}`} aria-label="Interactive Child of the Machine computer">
      <div className="poster-monitor">
        <div className="poster-screen" aria-live="polite">
          <div className="terminal-code" aria-hidden="true">{codeBlocks}</div>
          <div className="terminal-faller" aria-hidden="true">
            <i className="head" /><i className="torso" /><i className="arm arm-a" /><i className="arm arm-b" />
            <i className="leg leg-a" /><i className="leg leg-b" /><i className="motion motion-a" /><i className="motion motion-b" />
          </div>
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
              <button type="button" className={`${key === "SPACE" ? "is-space" : ""}${activeKey === `${key}-${index}` ? " is-active" : ""}`} key={`${key}-${index}`} aria-label={`${key} glitch key`} onClick={() => playKey(key, index)}><span>{key.length <= 2 ? key : ""}</span></button>
            ))}
          </div>
          <div className="poster-pad">
            {padKeys.map((key, index) => <button type="button" key={`${key}-${index}`} aria-label={`Number pad ${key} glitch key`} onClick={() => playKey(key, index + mainKeys.length)}>{key}</button>)}
          </div>
        </div>
      </div>
      <p className="terminal-instruction">POWER · SLIDERS · KEYS / sound begins only when you touch the machine</p>
    </section>
  );
}
