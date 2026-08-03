import Link from "next/link";
import { DeqAtlas } from "./deq-atlas";

export const metadata = {
  title: "DEQ Atlas",
  description: "Navigate a learned seven-dimensional route through the nonlinear DEQ Morph Bank with two repeatable coordinates.",
};

export default function DeqAtlasPage() {
  return (
    <main className="atlas-page">
      <header className="atlas-head">
        <Link className="back" href="/gallery">Gallery</Link>
        <div>
          <span className="eyebrow">Interactive Exhibit 18 · Learned Systems</span>
          <h1>DEQ Atlas</h1>
        </div>
        <span className="folio">COTM / 7D ROUTE</span>
      </header>
      <DeqAtlas />
    </main>
  );
}
