import Link from "next/link";

export const metadata = { title: "The Compendium" };

export default function Compendium() {
  return (
    <main className="page archive">
      <header className="page-head"><Link className="back" href="/">Index</Link><span className="folio">Room 01 / 04</span></header>
      <h1>The<br />Compendium</h1>
      <p className="page-subtitle">A living index of fragments. The original archive is empty, so this room is ready for its first entries.</p>
      <ul className="archive-list">
        <li><span>001</span><Link href="/compendium/nonlinear-oscillations"><strong>Harmonic &amp; Nonlinear Oscillations</strong></Link><small>Read the entry →</small></li>
        <li><span>002</span><strong>Objects &amp; observations</strong><small>Awaiting material</small></li>
        <li><span>003</span><strong>Unsorted fragments</strong><small>Awaiting material</small></li>
      </ul>
    </main>
  );
}
