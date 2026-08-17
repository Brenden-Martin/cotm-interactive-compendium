import Link from "next/link";
import { SpectrumLab } from "./spectrum-lab";

export const metadata = {
  title: "Spectrum to RGB",
  description: "Shape a spectrum and watch CIE 1931 tristimulus values become an sRGB display color.",
  openGraph: { images: ["/og-waveforms.png"] },
  twitter: { card: "summary_large_image", images: ["/og-waveforms.png"] },
};

export default function SpectrumToRgbPage() {
  return (
    <main className="spectrum-page">
      <header className="spectrum-head">
        <Link className="back" href="/gallery">Gallery</Link>
        <div>
          <span className="eyebrow">Interactive Exhibit 17 · Colorimetry</span>
          <h1>Spectrum<br />to RGB</h1>
        </div>
        <span className="folio">CIE / sRGB</span>
      </header>
      <SpectrumLab />
    </main>
  );
}
