"use client";

/* eslint-disable @next/next/no-img-element -- each supplied logo remains an exact source asset */
import { useEffect, useState } from "react";

const marks = [
  ["angular", "Angular"],
  ["angular-rounded", "Angular Rounded"],
  ["circular", "Circular"],
  ["convergance", "Convergance"],
  ["doubles", "Doubles"],
  ["flats", "Flats"],
  ["loguitar", "Loguitar"],
  ["median", "Median"],
  ["perspective", "Perspective"],
  ["roundwings", "Roundwings"],
  ["sunset", "Sunset"],
  ["vanilla", "Vanilla"],
  ["vertical", "Vertical"],
  ["wings", "Wings"],
] as const;

export function RandomCotmMark() {
  const [selected, setSelected] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const value = crypto.getRandomValues(new Uint32Array(1))[0];
      setSelected(value % marks.length);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  if (selected === null) return <div className="sold-mark sold-mark-placeholder" aria-hidden="true" />;
  const [slug, label] = marks[selected];
  return (
    <figure className={`sold-mark${loaded ? " is-loaded" : ""}`}>
      <img
        src={`/music/logos/${slug}.png`}
        alt={`Child of the Machine ${label} logo variation`}
        onLoad={() => setLoaded(true)}
      />
    </figure>
  );
}
