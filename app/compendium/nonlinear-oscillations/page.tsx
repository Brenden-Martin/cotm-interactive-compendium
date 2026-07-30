import Link from "next/link";

export const metadata = { title: "Harmonic & Nonlinear Oscillations" };

export default function NonlinearOscillationsArticle() {
  return <main className="comp-entry">
    <header><Link className="back" href="/compendium">Compendium</Link><span className="folio">Entry 001 / Dynamics</span></header>
    <article>
      <p className="eyebrow">Field Note 001</p>
      <h1>Harmonic &amp;<br/>Nonlinear Oscillations</h1>
      <p className="comp-lede">A spring’s simplest song is a sine wave. Reshape its potential well and that single note develops asymmetry, overtones, bifurcations, and surprises.</p>
      <Link className="comp-exhibit-link" href="/gallery/nonlinear-oscillator">Open the interactive laboratory →</Link>
      <section><h2>The harmonic case</h2><p>A harmonic oscillator experiences a restoring force proportional to displacement and directed toward equilibrium: <strong>F = −kx</strong>. Its potential energy is parabolic, <strong>V(x) = ½kx²</strong>, so an undriven ideal oscillator repeats at one natural frequency.</p></section>
      <section><h2>Reshaping the well</h2><p>Real restoring forces are rarely perfectly linear. We represent an adjustable potential as <strong>V(x) = a₂x² + a₃x³ + a₄x⁴ + a₅x⁵ + a₆x⁶</strong>. The force is its negative derivative. Even powers alter stiffness and confinement; odd powers break left–right symmetry.</p></section>
      <section><h2>Where harmonics come from</h2><p>A sinusoidal drive through a nonlinear force law need not produce sinusoidal motion. The distorted orbit contains integer multiples and combinations of the driving and natural frequencies. The spectrum reveals those components even when the time trace looks merely complicated.</p></section>
      <section><h2>Crystal lattices</h2><p>Atoms in a crystal vibrate near local energy minima. A quadratic approximation explains small oscillations, but higher-order terms become important as amplitude or temperature rises. These anharmonic terms enable thermal expansion, mode coupling, finite phonon lifetimes, and heat transport.</p></section>
      <aside><strong>Try this:</strong> begin with only a₂, then introduce a₄. Raise the drive until extra spectral peaks appear. Add a small a₃ term and notice how the motion loses mirror symmetry.</aside>
      <Link className="comp-exhibit-link bottom" href="/gallery/nonlinear-oscillator">Experiment with the oscillator →</Link>
    </article>
  </main>;
}
