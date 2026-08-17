import Link from "next/link";

export const metadata = {
  title: "Logs · The Compendium",
  description: "Field notes and companion writing for the interactive exhibits.",
};

export default function LogsPage() {
  return (
    <main className="page archive compendium-subindex logs-index">
      <header className="page-head"><Link className="back" href="/compendium">Compendium</Link><span className="folio">Collection 01 / Logs</span></header>
      <h1>Logs</h1>
      <p className="page-subtitle">The original Compendium index, retained as the home for every interactive exhibit companion.</p>
      <ul className="archive-list">
        <li><span>001</span><Link href="/compendium/nonlinear-oscillations"><strong>Harmonic &amp; Nonlinear Oscillations</strong></Link><small>Read the entry →</small></li>
        <li><span>002</span><Link href="/compendium/polarization-space"><strong>Polarization Space &amp; Waveplates</strong></Link><small>Read the entry →</small></li>
        <li><span>003</span><Link href="/compendium/fraunhofer-diffraction"><strong>Square Apertures &amp; Fraunhofer Diffraction</strong></Link><small>Read the entry →</small></li>
        <li><span>004</span><Link href="/compendium/perlin-noise"><strong>Perlin Noise &amp; Coherent Randomness</strong></Link><small>Read the entry →</small></li>
        <li><span>005</span><Link href="/compendium/mirror-steering"><strong>Steering Light with a Mirror</strong></Link><small>Read the entry →</small></li>
        <li><span>006</span><strong>Unsorted fragments</strong><small>Awaiting material</small></li>
      </ul>
    </main>
  );
}
