import Link from "next/link";

export const metadata = { title: "Gallery" };

export default function Gallery() {
  return (
    <main className="page gallery-page">
      <header className="page-head"><Link className="back" href="/">Index</Link><span className="folio">Room 03 / 04</span></header>
      <h1>Gallery</h1>
      <p className="page-subtitle">Studies in color, balance, repetition, and the useful accident.</p>
      <section className="gallery-grid" aria-label="Visual studies">
        <Link className="study gravity-entry" href="/gallery/gravity">
          <span className="eyebrow">Exhibit 01 / Gravity</span>
          <div className="gravity-entry-orbits" aria-hidden="true"><i /><i /><i /></div>
          <strong>Two &amp; Three Bodies</strong>
          <small>Enter the simulation →</small>
        </Link>
        <Link className="study lava-entry" href="/gallery/lava-lamp">
          <span className="eyebrow">Exhibit 02 / Fluid Mechanics</span>
          <div className="lava-entry-lamp" aria-hidden="true"><i /><i /><i /><i /></div>
          <strong>Lava Lamp</strong>
          <small>Enter the simulation →</small>
        </Link>
        <Link className="study deq-entry" href="/gallery/nonlinear-deq">
          <span className="eyebrow">Exhibit 03 / Nonlinear Systems</span>
          <div className="deq-entry-field" aria-hidden="true"><i /><i /><i /></div>
          <strong>DEQ Sandbox</strong>
          <small>Enter the simulation →</small>
        </Link>
        <Link className="study moire-entry" href="/gallery/moire">
          <span className="eyebrow">Exhibit 04 / Optical Interference</span>
          <div className="moire-entry-field" aria-hidden="true" />
          <strong>Moiré Field</strong>
          <small>Enter the simulation →</small>
        </Link>
        <Link className="study lissajous-entry" href="/gallery/lissajous">
          <span className="eyebrow">Exhibit 05 / Harmonic Motion</span>
          <div className="lissajous-entry-scope" aria-hidden="true"><i /></div>
          <strong>Lissajous Scope</strong>
          <small>Enter the simulation →</small>
        </Link>
        <Link className="study catenary-entry" href="/gallery/catenary">
          <span className="eyebrow">Exhibit 06 / Distributed Weight</span>
          <div className="catenary-entry-cord" aria-hidden="true"><i /><i /></div>
          <strong>Catenary Lab</strong>
          <small>Enter the simulation →</small>
        </Link>
        <Link className="study rings-entry" href="/gallery/rotating-rings">
          <span className="eyebrow">Exhibit 07 / Rigid-Body Dynamics</span>
          <div className="rings-entry-figure" aria-hidden="true"><i /><i /></div>
          <strong>Rotating Rings</strong>
          <small>Enter the simulation →</small>
        </Link>
        <Link className="study oscillator-entry" href="/gallery/nonlinear-oscillator">
          <span className="eyebrow">Exhibit 08 / Anharmonic Motion</span>
          <div className="oscillator-entry-wave" aria-hidden="true"><i /></div>
          <strong>Nonlinear Oscillator</strong>
          <small>Enter the laboratory →</small>
        </Link>
        <article className="study orbit-study"><span className="eyebrow">Study 01 / Orbit</span><div className="study-shape" /><small>Circle against field</small></article>
        <article className="study signal-study"><span className="eyebrow">Study 02 / Signal</span><div className="study-shape" /><small>Three notes held apart</small></article>
        <article className="study turn-study"><span className="eyebrow">Study 03 / Turn</span><div className="study-shape" /><small>Square refusing stillness</small></article>
      </section>
    </main>
  );
}
