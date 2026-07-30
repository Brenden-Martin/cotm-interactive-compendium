import Link from "next/link";
export const metadata={title:"Polarization Space & Waveplates"};
export default function PolarizationArticle(){return <main className="comp-entry"><header><Link className="back" href="/compendium">Compendium</Link><span className="folio">Entry 002 / Optics</span></header><article>
  <p className="eyebrow">Field Note 002</p><h1>Polarization<br/>Space</h1>
  <p className="comp-lede">Polarization is not merely an arrow. Two perpendicular field components, each with amplitude and phase, trace a family of lines, ellipses, and circles—and optical elements act on them like matrices.</p>
  <Link className="comp-exhibit-link" href="/gallery/polarization-space">Open the optical bench →</Link>
  <section><h2>Jones space</h2><p>Using horizontal H = [1,0] and vertical V = [0,1] as basis states, an arbitrary coherent polarization is P = aH + bV, with complex coefficients. Their magnitudes set component amplitudes; their arguments encode phase delay.</p></section>
  <section><h2>Ellipses and handedness</h2><p>Equal phase produces linear polarization. A relative phase produces an ellipse; equal amplitudes separated by a quarter cycle produce circular polarization. Handedness depends on the sign of that delay and the chosen viewing convention.</p></section>
  <section><h2>Waveplates as operators</h2><p>A quarter-wave plate adds π/2 of relative phase along its material axes; a half-wave plate adds π. At angle θ, the element becomes W(θ) = R(−θ) W R(θ): rotate into the plate frame, apply retardance, then rotate back.</p></section>
  <section><h2>The Poincaré sphere</h2><p>Normalized Stokes coordinates place every pure polarization on a sphere. Opposite points are orthogonal states. Linear states occupy the equator, while the poles represent opposite circular handedness.</p></section>
  <section><h2>Ordering the optics</h2><p>QWP→HWP and HWP→QWP can both span the sphere from a fixed linear input, but they do not feel equally intuitive. A QWP can establish ellipticity before a HWP adjusts orientation. For arbitrary input-to-output transformations, QWP→HWP→QWP provides universal control.</p></section>
  <aside><strong>Try this:</strong> choose diagonal input, set the QWP to its axes, and observe circular output. Then swap the plate order and hunt for the same point on the sphere by a different path.</aside>
  <Link className="comp-exhibit-link bottom" href="/gallery/polarization-space">Explore polarization space →</Link>
</article></main>}
