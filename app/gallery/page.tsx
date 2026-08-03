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
          <span className="eyebrow">Exhibit 07 / Torsion Dynamics</span>
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
        <Link className="study polarization-entry" href="/gallery/polarization-space">
          <span className="eyebrow">Exhibit 09 / Polarization Optics</span>
          <div className="polarization-entry-sphere" aria-hidden="true"><i /><i /></div>
          <strong>Polarization Space</strong>
          <small>Enter the optical bench →</small>
        </Link>
        <Link className="study diffraction-entry" href="/gallery/square-aperture">
          <span className="eyebrow">Exhibit 10 / Wave Optics</span>
          <div className="diffraction-entry-field" aria-hidden="true"><i /></div>
          <strong>Square Aperture</strong>
          <small>Enter the Fourier plane →</small>
        </Link>
        <Link className="study noise-entry" href="/gallery/perlin-noise">
          <span className="eyebrow">Exhibit 11 / Procedural Fields</span>
          <div className="noise-entry-field" aria-hidden="true" />
          <strong>Perlin Noise</strong>
          <small>Enter the field generator →</small>
        </Link>
        <Link className="study mirror-entry" href="/gallery/mirror-steering">
          <span className="eyebrow">Exhibit 12 / Geometric Optics</span>
          <div className="mirror-entry-figure" aria-hidden="true"><i/><i/><i/></div>
          <strong>Mirror Steering</strong>
          <small>Enter the ray table →</small>
        </Link>
        <Link className="study deq-entry deq-foundry-entry" href="/gallery/deq-morph-bank">
          <span className="eyebrow">Exhibit 13 / Collective Systems</span>
          <div className="deq-entry-field" aria-hidden="true"><i /><i /><i /></div>
          <strong>DEQ Morph Bank</strong>
          <small>Collect a new anchor →</small>
        </Link>
        <Link className="study lava3d-entry" href="/gallery/lava-volume">
          <span className="eyebrow">Exhibit 14 / Volumetric Fluid</span>
          <div className="lava3d-entry-volume" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
          <strong>Voxel Lava Volume</strong>
          <small>Enter the volume →</small>
        </Link>
        <Link className="study boids-entry" href="/gallery/boids">
          <span className="eyebrow">Exhibit 15 / Emergent Motion</span>
          <div className="boids-entry-sky" aria-hidden="true"><span /><span /><i /><i /><i /><i /><i /><i /></div>
          <strong>Boids</strong>
          <small>Join the flock →</small>
        </Link>
        <Link className="study fortune-entry" href="/gallery/fortune-cookie">
          <span className="eyebrow">Exhibit 16 / Dubious Prognostication</span>
          <div className="fortune-entry-cookie" aria-hidden="true"><i /><span /></div>
          <strong>Fortune Cookie</strong>
          <small>Consult the oracle →</small>
        </Link>
      </section>
    </main>
  );
}
