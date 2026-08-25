"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

const TOPICS = [
  ["all", "All exhibits"],
  ["glitch-goo", "Glitch Goo"],
  ["visualizers", "Visualizers"],
  ["mechanics", "Mechanics"],
  ["materials-science", "Materials Science"],
  ["electromagnetics", "Electromagnetics"],
  ["audio", "Audio"],
  ["optics", "Optics"],
  ["oscillators", "Oscillators"],
  ["games-of-life", "Games of Life"],
  ["lava-lamps", "Lava Lamps"],
] as const;

export function GalleryTopicShell({ children }: { children: ReactNode }) {
  const [topic, setTopic] = useState("all");

  return (
    <main className="page gallery-page gallery-filtered" data-topic={topic}>
      <header className="page-head gallery-page-head">
        <Link className="back" href="/">Index</Link>
        <div className="gallery-head-tools">
          <label><span>Topic</span><select value={topic} onChange={(event) => setTopic(event.target.value)}>{TOPICS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <span className="folio">Room 03 / 04</span>
        </div>
      </header>
      <h1>Gallery</h1>
      <p className="page-subtitle">Studies in color, balance, repetition, and the useful accident.</p>
      <section className="gallery-grid" aria-label={topic === "all" ? "All visual studies" : `${TOPICS.find(([value]) => value === topic)?.[1]} visual studies`}>
        {children}
      </section>
    </main>
  );
}
