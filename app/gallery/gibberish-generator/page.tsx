import Link from "next/link";
import { GibberishGenerator } from "./gibberish-generator";

export const metadata = {
  title: "Gibberish Generator",
  description: "A character-alignment speech synthesizer and nonlinear text-field instrument.",
};

export default function GibberishGeneratorPage() {
  return (
    <main className="gibberish-page">
      <header className="gibberish-head">
        <Link className="back" href="/gallery">Gallery</Link>
        <div>
          <span className="eyebrow">Interactive Exhibit 22 · Character Systems</span>
          <h1>Gibberish Generator</h1>
        </div>
        <span className="folio">COTM / L·S·I</span>
      </header>
      <GibberishGenerator />
    </main>
  );
}
