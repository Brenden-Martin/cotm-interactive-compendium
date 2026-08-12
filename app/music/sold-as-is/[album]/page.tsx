/* eslint-disable @next/next/no-img-element -- exact user-owned album artwork */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAlbum, soldAsIsAlbums } from "../tracks";

export function generateStaticParams() {
  return soldAsIsAlbums.map((album) => ({ album: album.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ album: string }> }) {
  const { album: slug } = await params;
  const album = getAlbum(slug);
  return album ? { title: `${album.title} · Sold As Is {No Returns}`, description: album.description } : {};
}

export default async function SoldAsIsAlbumPage({ params }: { params: Promise<{ album: string }> }) {
  const { album: slug } = await params;
  const album = getAlbum(slug);
  if (!album) notFound();

  return (
    <main className="page music-page sai-album-page">
      <header className="page-head">
        <Link className="back" href="/music/sold-as-is">Sold As Is {"{No Returns}"}</Link>
        <span className="folio">{album.catalogNumber}</span>
      </header>
      <section className="sai-album-hero">
        <div>
          <span className="eyebrow">Child of the Machine / Album Directory</span>
          <h1>{album.title}</h1>
          <p className="page-subtitle">{album.description}</p>
        </div>
        <img src={album.coverSrc} alt={album.coverAlt} />
      </section>
      <ol className="sai-track-list">
        {album.tracks.map((track, index) => (
          <li key={track.slug}>
            <Link href={`/music/sold-as-is/${album.slug}/${track.slug}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{track.title}</strong>
              <small>{track.catalogNumber} · Listen →</small>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
