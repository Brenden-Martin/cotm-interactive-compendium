/* eslint-disable @next/next/no-img-element -- direct user-owned artwork is intentionally served without an image proxy */
import Link from "next/link";
import { RandomCotmMark } from "./random-cotm-mark";
import { soldAsIsAlbums } from "./tracks";

export const metadata = {
  title: "Sold As Is {No Returns}",
  description: "Unreleased recordings from Child of the Machine, presented exactly as found.",
};

export default function SoldAsIsPage() {
  return (
    <main className="page music-page sold-as-is-page">
      <header className="page-head sold-head">
        <Link className="back" href="/music">Music</Link>
        <span className="folio">Listening Room 01 / Unreleased Work</span>
      </header>

      <section className="sold-title-row">
        <div>
          <span className="eyebrow">Child of the Machine / Shelf Copy</span>
          <h1>Sold As Is {"{No Returns}"}</h1>
          <p className="page-subtitle">
            Unreleased music, alternate passes, and other recordings retrieved from the backlog.
          </p>
        </div>
        <RandomCotmMark />
      </section>

      <section className="release-grid" aria-label="Sold As Is releases">
        <Link className="release-card" href="/music/sold-as-is/moog-preset-alternate-4">
          <span className="release-number">SAI / 001</span>
          <img src="/music/sold-as-is/cotm-calculator.png" alt="A green pocket synthesizer calculator with Child of the Machine album art taped into its case" />
          <div className="release-card-copy">
            <span>Child of the Machine</span>
            <strong>Moog Preset Alternate 4</strong>
            <small>Alternate recording · Enter the listening room →</small>
          </div>
        </Link>
        {soldAsIsAlbums.map((album) => (
          <Link className="release-card" href={`/music/sold-as-is/${album.slug}`} key={album.slug}>
            <span className="release-number">{album.catalogNumber}</span>
            <img src={album.coverSrc} alt={album.coverAlt} />
            <div className="release-card-copy">
              <span>Child of the Machine · Album Directory</span>
              <strong>{album.title}</strong>
              <small>{album.tracks.length} {album.tracks.length === 1 ? "recording" : "tracks"} · Open the directory →</small>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
