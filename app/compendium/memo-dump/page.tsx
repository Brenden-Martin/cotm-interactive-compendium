import Link from "next/link";

export const metadata = {
  title: "Memo Dump · The Compendium",
  description: "A staged archive for photographed pocket notes and hand-drawn diagrams.",
};

const eras = ["Memo Dump I", "Memo Dump II", "Memo Dump III"];

export default function MemoDumpPage() {
  return (
    <main className="page archive compendium-subindex memo-dump-page">
      <header className="page-head"><Link className="back" href="/compendium">Compendium</Link><span className="folio">Collection 02 / Pocket Archive</span></header>
      <h1>Memo<br />Dump</h1>
      <p className="page-subtitle">An eventual image archive of scrawled pocket notes: diagrams, half-ideas, equations, and daily fragments, preserved in three eras.</p>
      <section className="era-grid" aria-label="Memo Dump eras">
        {eras.map((era, index) => (
          <article className="era-card" key={era}>
            <span>Era 0{index + 1}</span>
            <div className="era-paper" aria-hidden="true"><i /><i /><i /><i /></div>
            <h2>{era}</h2>
            <p>Photograph intake awaiting its first dated batch.</p>
            <small>Archive reserved</small>
          </article>
        ))}
      </section>
    </main>
  );
}
