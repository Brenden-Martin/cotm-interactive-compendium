import Link from "next/link";
import { notFound } from "next/navigation";
import { SoldAsIsListeningRoom } from "../../sold-as-is-listening-room";
import { getAlbum, getAlbumTrack, soldAsIsAlbums } from "../../tracks";

export function generateStaticParams() {
  return soldAsIsAlbums.flatMap((album) => album.tracks.map((track) => ({ album: album.slug, track: track.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ album: string; track: string }> }) {
  const route = await params;
  const track = getAlbumTrack(route.album, route.track);
  return track ? { title: `${track.title} · Sold As Is {No Returns}`, description: track.subtitle } : {};
}

export default async function SoldAsIsTrackPage({ params }: { params: Promise<{ album: string; track: string }> }) {
  const route = await params;
  const album = getAlbum(route.album);
  const track = getAlbumTrack(route.album, route.track);
  if (!album || !track) notFound();

  return (
    <main className="music-track-page" style={{ background: track.palette.page, color: track.palette.ink }}>
      <header className="music-track-head">
        <Link className="back" href={`/music/sold-as-is/${album.slug}`}>{album.title}</Link>
        <span className="folio">{track.catalogNumber}</span>
      </header>
      <SoldAsIsListeningRoom track={track} />
    </main>
  );
}
