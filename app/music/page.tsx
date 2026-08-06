/* eslint-disable @next/next/no-img-element -- direct user-owned artwork is intentionally served without an image proxy */
import Link from "next/link";

export const metadata = {
  title: "Music",
  description: "Recordings and browser instruments from Child of the Machine.",
};

export default function Music() {
  return (
    <main className="page music-page music-index-page">
      <header className="page-head">
        <Link className="back" href="/">Index</Link>
        <span className="folio">Room 02 / 04</span>
      </header>
      <h1>Music</h1>
      <p className="page-subtitle">
        Recordings from the shelf, small instruments from the workbench, and machinery that listens back.
      </p>

      <section className="music-collection-grid" aria-label="Music collections">
        <Link className="music-entry music-archive-entry" href="/music/sold-as-is">
          <span className="eyebrow">Listening Room 01 / Unreleased Work</span>
          <div className="music-archive-figure" aria-hidden="true">
            <img src="/music/logos/cotm-circle-icon.png" alt="" />
            <i /><i /><i />
          </div>
          <strong>Sold As Is {"{No Returns}"}</strong>
          <small>Open the archive →</small>
        </Link>

        <Link className="music-entry music-signals-entry" href="/music/tone-board">
          <span className="eyebrow">Listening Room 02 / Browser Instrument</span>
          <div className="music-signals-figure" aria-hidden="true">
            <i /><i /><i /><i />
          </div>
          <strong>Four Small Signals</strong>
          <small>Play the instrument →</small>
        </Link>
      </section>
    </main>
  );
}
