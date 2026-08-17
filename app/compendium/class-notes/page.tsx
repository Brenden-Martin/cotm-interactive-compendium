import Link from "next/link";

export const metadata = {
  title: "Class Notes · The Compendium",
  description: "An illustrated archive for handwritten college course notebooks.",
};

export default function ClassNotesPage() {
  return (
    <main className="page archive compendium-subindex class-notes-page">
      <header className="page-head"><Link className="back" href="/compendium">Compendium</Link><span className="folio">Collection 03 / Illustrated Study</span></header>
      <h1>Class<br />Notes</h1>
      <p className="page-subtitle">Handwritten course notebooks will be photo-scanned and organized by class, preserving the diagrams as both explanations and artwork.</p>
      <section className="notes-intake">
        <div className="notes-intake-figure" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <div>
          <span className="eyebrow">Course shelves ready</span>
          <h2>Awaiting the first notebook</h2>
          <p>Each class will receive its own subsection with ordered scans, a course index, and room for short annotations without disturbing the original pages.</p>
        </div>
      </section>
    </main>
  );
}
