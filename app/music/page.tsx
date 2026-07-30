import Link from "next/link";
import { ToneBoard } from "../site";

export const metadata = { title: "Music" };

export default function Music() {
  return (
    <main className="page music-page">
      <header className="page-head"><Link className="back" href="/">Index</Link><span className="folio">Room 02 / 04</span></header>
      <h1>Music</h1>
      <p className="page-subtitle">Four small signals. Tap a panel to make the browser sing.</p>
      <ToneBoard />
    </main>
  );
}
