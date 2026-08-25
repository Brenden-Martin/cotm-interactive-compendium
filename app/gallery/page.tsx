import Link from "next/link";
import { GalleryTopicShell } from "./gallery-topic-shell";

export const metadata = { title: "Gallery" };

export default function Gallery() {
  return (
    <GalleryTopicShell>
        <Link className="study gravity-entry" data-topics="mechanics" href="/gallery/gravity">
          <span className="eyebrow">Exhibit 01 / Gravity</span>
          <div className="gravity-entry-orbits" aria-hidden="true"><i /><i /><i /></div>
          <strong>Two &amp; Three Bodies</strong>
          <small>Enter the simulation →</small>
        </Link>
        <Link className="study lava-entry" data-topics="materials-science lava-lamps" href="/gallery/lava-lamp">
          <span className="eyebrow">Exhibit 02 / Fluid Mechanics</span>
          <div className="lava-entry-lamp" aria-hidden="true"><i /><i /><i /><i /></div>
          <strong>Lava Lamp</strong>
          <small>Enter the simulation →</small>
        </Link>
        <Link className="study deq-entry" data-topics="glitch-goo visualizers" href="/gallery/nonlinear-deq">
          <span className="eyebrow">Exhibit 03 / Nonlinear Systems</span>
          <div className="deq-entry-field" aria-hidden="true"><i /><i /><i /></div>
          <strong>DEQ Sandbox</strong>
          <small>Enter the simulation →</small>
        </Link>
        <Link className="study moire-entry" data-topics="optics" href="/gallery/moire">
          <span className="eyebrow">Exhibit 04 / Optical Interference</span>
          <div className="moire-entry-field" aria-hidden="true" />
          <strong>Moiré Field</strong>
          <small>Enter the simulation →</small>
        </Link>
        <Link className="study lissajous-entry" data-topics="audio oscillators" href="/gallery/lissajous">
          <span className="eyebrow">Exhibit 05 / Harmonic Motion</span>
          <div className="lissajous-entry-scope" aria-hidden="true"><i /></div>
          <strong>Lissajous Scope</strong>
          <small>Enter the simulation →</small>
        </Link>
        <Link className="study catenary-entry" data-topics="mechanics" href="/gallery/catenary">
          <span className="eyebrow">Exhibit 06 / Distributed Weight</span>
          <div className="catenary-entry-cord" aria-hidden="true"><i /><i /></div>
          <strong>Catenary Lab</strong>
          <small>Enter the simulation →</small>
        </Link>
        <Link className="study rings-entry" data-topics="mechanics oscillators" href="/gallery/rotating-rings">
          <span className="eyebrow">Exhibit 07 / Torsion Dynamics</span>
          <div className="rings-entry-figure" aria-hidden="true"><i /><i /></div>
          <strong>Rotating Rings</strong>
          <small>Enter the simulation →</small>
        </Link>
        <Link className="study oscillator-entry" data-topics="audio oscillators" href="/gallery/nonlinear-oscillator">
          <span className="eyebrow">Exhibit 08 / Anharmonic Motion</span>
          <div className="oscillator-entry-wave" aria-hidden="true"><i /></div>
          <strong>Nonlinear Oscillator</strong>
          <small>Enter the laboratory →</small>
        </Link>
        <Link className="study polarization-entry" data-topics="electromagnetics optics" href="/gallery/polarization-space">
          <span className="eyebrow">Exhibit 09 / Polarization Optics</span>
          <div className="polarization-entry-sphere" aria-hidden="true"><i /><i /></div>
          <strong>Polarization Space</strong>
          <small>Enter the optical bench →</small>
        </Link>
        <Link className="study diffraction-entry" data-topics="electromagnetics optics" href="/gallery/square-aperture">
          <span className="eyebrow">Exhibit 10 / Wave Optics</span>
          <div className="diffraction-entry-field" aria-hidden="true"><i /></div>
          <strong>Square Aperture</strong>
          <small>Enter the Fourier plane →</small>
        </Link>
        <Link className="study noise-entry" data-topics="games-of-life visualizers" href="/gallery/perlin-noise">
          <span className="eyebrow">Exhibit 11 / Procedural Fields</span>
          <div className="noise-entry-field" aria-hidden="true" />
          <strong>Perlin Noise</strong>
          <small>Enter the field generator →</small>
        </Link>
        <Link className="study mirror-entry" data-topics="electromagnetics optics" href="/gallery/mirror-steering">
          <span className="eyebrow">Exhibit 12 / Geometric Optics</span>
          <div className="mirror-entry-figure" aria-hidden="true"><i/><i/><i/></div>
          <strong>Mirror Steering</strong>
          <small>Enter the ray table →</small>
        </Link>
        <Link className="study deq-entry deq-foundry-entry" data-topics="glitch-goo visualizers audio" href="/gallery/deq-morph-bank">
          <span className="eyebrow">Exhibit 13 / Collective Systems</span>
          <div className="deq-entry-field" aria-hidden="true"><i /><i /><i /></div>
          <strong>DEQ Morph Bank</strong>
          <small>Collect a new anchor →</small>
        </Link>
        <Link className="study lava3d-entry" data-topics="materials-science lava-lamps" href="/gallery/lava-volume">
          <span className="eyebrow">Exhibit 14 / Volumetric Fluid</span>
          <div className="lava3d-entry-volume" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
          <strong>Voxel Lava Volume</strong>
          <small>Enter the volume →</small>
        </Link>
        <Link className="study boids-entry" data-topics="games-of-life" href="/gallery/boids">
          <span className="eyebrow">Exhibit 15 / Emergent Motion</span>
          <div className="boids-entry-sky" aria-hidden="true"><span /><span /><i /><i /><i /><i /><i /><i /></div>
          <strong>Boids</strong>
          <small>Join the flock →</small>
        </Link>
        <Link className="study fortune-entry" data-topics="games-of-life" href="/gallery/fortune-cookie">
          <span className="eyebrow">Exhibit 16 / Dubious Prognostication</span>
          <div className="fortune-entry-cookie" aria-hidden="true"><i /><span /></div>
          <strong>Fortune Cookie</strong>
          <small>Consult the oracle →</small>
        </Link>
        <Link className="study spectrum-entry" data-topics="electromagnetics optics visualizers" href="/gallery/spectrum-to-rgb">
          <span className="eyebrow">Exhibit 17 / Colorimetry</span>
          <div className="spectrum-entry-field" aria-hidden="true"><i /><i /><i /><span /></div>
          <strong>Spectrum to RGB</strong>
          <small>Shape the light →</small>
        </Link>
        <Link className="study deq-atlas-entry" data-topics="glitch-goo visualizers" href="/gallery/deq-atlas">
          <span className="eyebrow">Exhibit 18 / Learned Systems</span>
          <div className="deq-atlas-entry-route" aria-hidden="true"><span /><i /><i /><i /><i /><b /></div>
          <strong>DEQ Atlas</strong>
          <small>Navigate the learned field →</small>
        </Link>
        <Link className="study manifold-entry" data-topics="games-of-life mechanics" href="/gallery/manifold-golf">
          <span className="eyebrow">Exhibit 19 / Differential Geometry</span>
          <div className="manifold-entry-course" aria-hidden="true"><span /><i /><i /><b /></div>
          <strong>Manifold Golf</strong>
          <small>Putt through curved space →</small>
        </Link>
        <Link className="study pendulum-entry" data-topics="mechanics oscillators" href="/gallery/pendulum-lab">
          <span className="eyebrow">Exhibit 20 / Nonlinear Dynamics</span>
          <div className="pendulum-entry-figure" aria-hidden="true"><i /><b /><span /></div>
          <strong>Pendulum Laboratory</strong>
          <small>Set the system in motion →</small>
        </Link>
        <Link className="study luckfield-entry" data-topics="glitch-goo visualizers audio" href="/gallery/the-luckfield">
          <span className="eyebrow">Exhibit 21 / Recursive Fields</span>
          <div className="luckfield-entry-field" aria-hidden="true"><i /><i /><i /><span /><b /></div>
          <strong>The Luckfield</strong>
          <small>Let the field choose itself →</small>
        </Link>
        <Link className="study gibberish-entry" data-topics="glitch-goo games-of-life" href="/gallery/gibberish-generator">
          <span className="eyebrow">Exhibit 22 / Character Systems</span>
          <div className="gibberish-entry-bubble" aria-hidden="true"><i /><span>LUCK STRENGTH INTELLIGENCE</span></div>
          <strong>Gibberish Generator</strong>
          <small>Give a color its voice →</small>
        </Link>
        <Link className="study ratz-entry" data-topics="games-of-life" href="/gallery/ratz">
          <span className="eyebrow">Exhibit 23 / Stochastic Behavior</span>
          <div className="ratz-entry-den" aria-hidden="true"><i /><i /><i /><i /><b /><span /></div>
          <strong>Ratz</strong>
          <small>Follow the scent →</small>
        </Link>
        <Link className="study polymorph-entry" data-topics="visualizers audio lava-lamps" href="/gallery/polymorphic-goo">
          <span className="eyebrow">Exhibit 24 / Fourier Geometry</span>
          <div className="polymorph-entry-figure" aria-hidden="true"><i /><b /><span /></div>
          <strong>Polymorphic Goo</strong>
          <small>Modulate the blob →</small>
        </Link>
        <Link className="study chromadepth-entry" data-topics="visualizers optics audio" href="/gallery/chromadepth">
          <span className="eyebrow">Exhibit 25 / Depth Encoding</span>
          <div className="chromadepth-entry-figure" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <strong>ChromaDepth</strong>
          <small>Put on the spectrum →</small>
        </Link>
        <Link className="study phosphor-entry" data-topics="visualizers audio optics" href="/gallery/phosphor-scan">
          <span className="eyebrow">Exhibit 26 / Raster Persistence</span>
          <div className="phosphor-entry-figure" aria-hidden="true"><i /><i /><i /><i /><span /></div>
          <strong>Phosphor Scan</strong>
          <small>Excite the raster →</small>
        </Link>
        <Link className="study current-entry" data-topics="materials-science electromagnetics" href="/gallery/current">
          <span className="eyebrow">Exhibit 27 / Conductive Media</span>
          <div className="current-entry-field" aria-hidden="true"><i /><i /><i /><i /><span /></div>
          <strong>Current</strong>
          <small>Doodle a path →</small>
        </Link>
        <Link className="study material-entry" data-topics="materials-science electromagnetics" href="/gallery/material-phases">
          <span className="eyebrow">Exhibit 28 / Condensed Matter</span>
          <div className="material-entry-field" aria-hidden="true"><i /><i /><i /><i /><span /></div>
          <strong>Material Phases</strong>
          <small>Cross the phase boundary →</small>
        </Link>
        <Link className="study respiration-entry" data-topics="electromagnetics optics" href="/gallery/respiration-monitor">
          <span className="eyebrow">Exhibit 29 / Biomedical Optics</span>
          <div className="respiration-entry-field" aria-hidden="true"><i /><i /><i /><span /></div>
          <strong>Respiration Monitor</strong>
          <small>Measure the moving light →</small>
        </Link>
        <Link className="study kinetics-entry" data-topics="materials-science oscillators" href="/gallery/hysteretic-kinetics">
          <span className="eyebrow">Exhibit 30 / Nonequilibrium Kinetics</span>
          <div className="kinetics-entry-scope" aria-hidden="true"><i /><span /></div>
          <strong>Hysteretic Kinetics</strong>
          <small>Draw the living loop →</small>
        </Link>
        <Link className="study topography-entry" data-topics="audio visualizers games-of-life" href="/gallery/harmonic-topography">
          <span className="eyebrow">Exhibit 31 / Generative Harmony</span>
          <div className="topography-entry-field" aria-hidden="true"><i /><i /><i /><i /><span /><b /></div>
          <strong>Harmonic Topography</strong>
          <small>Walk the harmony →</small>
        </Link>
        <Link className="study phase-barrel-entry" data-topics="audio visualizers oscillators" href="/gallery/phase-barrel">
          <span className="eyebrow">Exhibit 32 / Audiovisual Rhythm</span>
          <div className="phase-barrel-entry-field" aria-hidden="true"><i /><i /><i /><i /><span /></div>
          <strong>Phase Barrel</strong>
          <small>Watch the ratios collide →</small>
        </Link>
        <Link className="study rain-entry" data-topics="audio visualizers mechanics oscillators" href="/gallery/do-you-hear-the-rain">
          <span className="eyebrow">Exhibit 33 / Counterfeit Weather</span>
          <div className="rain-entry-field" aria-hidden="true">
            <i /><i /><i /><i /><span /><b />
          </div>
          <strong>Do You Hear the Rain?</strong>
          <small>Patch a storm →</small>
        </Link>
    </GalleryTopicShell>
  );
}
