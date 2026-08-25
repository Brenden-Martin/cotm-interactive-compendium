import { HarmonicTopographyLab } from "./harmonic-topography-lab";

export const metadata = {
  title: "Harmonic Topography V24",
  description: "A seeded generative harmony machine where chord topology, modal memory, tension terrain, and a fixed musical clock become directly playable.",
  openGraph: { images: ["/og-waveforms.png"] },
  twitter: { card: "summary_large_image", images: ["/og-waveforms.png"] },
};

export default function HarmonicTopographyPage() { return <HarmonicTopographyLab />; }
