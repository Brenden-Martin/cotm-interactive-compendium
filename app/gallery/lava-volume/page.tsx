import Link from "next/link";
import { LavaVolume } from "./lava-volume";

export const metadata = {
  title: "Voxel Lava Volume",
  description: "A three-dimensional voxel-particle lava lamp experiment from Child of the Machine.",
  openGraph: { images: ["/og-lava.png"] },
  twitter: { card: "summary_large_image", images: ["/og-lava.png"] },
};

export default function LavaVolumePage() {
  return (
    <main className="voxel-page">
      <header className="voxel-head">
        <Link className="back" href="/gallery">Gallery</Link>
        <div>
          <span className="eyebrow">Interactive Exhibit 14 · Volumetric Fluid Mechanics</span>
          <h1>Voxel Lava Volume</h1>
        </div>
        <span className="folio">COTM / XYZ</span>
      </header>
      <LavaVolume />
    </main>
  );
}
