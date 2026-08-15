import { ChromadepthLab } from "./chromadepth-lab";

export const metadata = {
  title: "Chromadepth Kinetic Sculpture",
  description: "A perspective-projected 3D particle sculpture whose depth is encoded from red to blue for ChromaDepth glasses.",
  openGraph: { images: ["/og-waveforms.png"] },
  twitter: { card: "summary_large_image", images: ["/og-waveforms.png"] },
};

export default function ChromadepthPage() {
  return <ChromadepthLab />;
}
