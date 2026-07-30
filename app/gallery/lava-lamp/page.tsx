import Link from "next/link";
import { LavaLamp } from "./lava-lamp";

export const metadata = {
  title: "Lava Lamp",
  description: "An interactive heated-particle fluid mechanics exhibit from Child of the Machine.",
  openGraph: { images: ["/og-lava.png"] },
  twitter: { card: "summary_large_image", images: ["/og-lava.png"] },
};

export default function LavaLampPage() {
  return (
    <main className="lava-page">
      <header className="lava-head">
        <Link className="back" href="/gallery">Gallery</Link>
        <div>
          <span className="eyebrow">Interactive Exhibit 02 · Fluid Mechanics</span>
          <h1>Lava Lamp</h1>
        </div>
        <span className="folio">COTM / 2026</span>
      </header>
      <LavaLamp />
    </main>
  );
}
