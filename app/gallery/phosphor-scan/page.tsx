import { PhosphorScanLab } from "./phosphor-scan-lab";

export const metadata = {
  title: "Phosphor Scan",
  description: "A dot-serial CRT raster instrument with exponential persistence, waveform and Perlin deflection, live image and video sources, and a complete audio coupling matrix.",
  openGraph: { images: ["/og-waveforms.png"] },
  twitter: { card: "summary_large_image", images: ["/og-waveforms.png"] },
};

export default function PhosphorScanPage() {
  return <PhosphorScanLab />;
}
