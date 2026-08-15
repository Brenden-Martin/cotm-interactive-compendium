import Link from "next/link";
import { PolymorphicGooLab } from "./polymorphic-goo-lab";

export const metadata = {
  title: "Polymorphic Goo",
  description: "A reusable Fourier polygon instrument for morphing shape, harmonic wobble, dispersive rotation, toon rims, and audio-reactive hue.",
  openGraph: { images: ["/og-waveforms.png"] },
  twitter: { card: "summary_large_image", images: ["/og-waveforms.png"] },
};

export default function PolymorphicGooPage() {
  return (
    <main className="polymorph-page">
      <header className="polymorph-head"><Link href="/gallery">← Gallery</Link><span className="eyebrow">Interactive Exhibit 24 · Fourier Geometry</span><h1>Polymorphic<br />Goo</h1><p>One contour, four polite polygons, and several increasingly questionable sources of motion.</p></header>
      <PolymorphicGooLab />
    </main>
  );
}
