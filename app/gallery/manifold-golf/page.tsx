import Link from "next/link";
import { ManifoldGolf } from "./manifold-golf";

export const metadata = {
  title: "Manifold Golf",
  description: "Putt and play pool across toruses, spheres, Möbius strips, and Klein bottles while watching geodesics unfold.",
};

export default function ManifoldGolfPage() {
  return (
    <main className="manifold-page">
      <header className="manifold-head">
        <Link className="back" href="/gallery">Gallery</Link>
        <div>
          <span className="eyebrow">Interactive Exhibit 19 · Differential Geometry</span>
          <h1>Manifold Golf</h1>
        </div>
        <span className="folio">COTM / GEODESIC CLUB</span>
      </header>
      <ManifoldGolf />
    </main>
  );
}
