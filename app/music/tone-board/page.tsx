import Link from "next/link";
import { ToneBoard } from "../../site";

export const metadata = {
  title: "Four Small Signals",
  description: "A four-button browser instrument from Child of the Machine.",
};

export default function ToneBoardPage() {
  return (
    <main className="page music-page tone-board-page">
      <header className="page-head">
        <Link className="back" href="/music">Music</Link>
        <span className="folio">Listening Room 02 / Browser Instrument</span>
      </header>
      <h1>Four Small Signals</h1>
      <p className="page-subtitle">The original little instrument, left exactly where its four voices can still sing.</p>
      <ToneBoard />
    </main>
  );
}
