import Link from "next/link";
import { FortuneCookie } from "./fortune-cookie";

export const metadata = {
  title: "Fortune Cookie",
  description: "Crack a cartoon fortune cookie and leave a future fortune for the Child of the Machine review queue.",
};

export default function FortuneCookiePage() {
  return (
    <main className="fortune-page">
      <header className="fortune-head">
        <Link className="back" href="/gallery">Gallery</Link>
        <div>
          <span className="eyebrow">Interactive Exhibit 16 · Dubious Prognostication</span>
          <h1>Fortune<br />Cookie</h1>
        </div>
        <span className="folio">COTM / 16</span>
      </header>
      <FortuneCookie />
    </main>
  );
}
