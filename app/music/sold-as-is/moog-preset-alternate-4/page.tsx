import Link from "next/link";
import { MoogListeningRoom } from "./moog-listening-room";

export const metadata = {
  title: "Moog Preset Alternate 4 · Sold As Is {No Returns}",
  description: "Listen to Moog Preset Alternate 4 by Child of the Machine with an audio-reactive Glitch Goo field.",
};

export default function MoogPresetAlternateFourPage() {
  return (
    <main className="music-track-page">
      <header className="music-track-head">
        <Link className="back" href="/music/sold-as-is">Sold As Is {"{No Returns}"}</Link>
        <span className="folio">SAI / 001</span>
      </header>
      <MoogListeningRoom />
    </main>
  );
}
