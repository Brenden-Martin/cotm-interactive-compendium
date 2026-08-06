import Link from "next/link";

export const metadata = {
  title: "The Compendium",
  description: "Stories, field notes, pocket memos, and illustrated course notebooks from Child of the Machine.",
};

export default function Compendium() {
  return (
    <main className="page archive compendium-index">
      <header className="page-head">
        <Link className="back" href="/">Index</Link>
        <span className="folio">Room 01 / 04</span>
      </header>
      <h1>The<br />Compendium</h1>
      <p className="page-subtitle">A library of stories, working memory, handwritten study, and the field notes attached to the machines.</p>

      <section className="compendium-grid" aria-label="Compendium collections">
        <Link className="compendium-collection comp-logs-card" href="/compendium/logs">
          <span className="eyebrow">Collection 01 / Exhibit Companions</span>
          <div className="comp-logs-figure" aria-hidden="true"><i /><i /><i /><i /></div>
          <strong>Logs</strong>
          <p>Articles, explanations, and field notes paired with interactive exhibits.</p>
          <small>Open the logs →</small>
        </Link>

        <Link className="compendium-collection comp-memo-card" href="/compendium/memo-dump">
          <span className="eyebrow">Collection 02 / Pocket Archive</span>
          <div className="comp-memo-figure" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <strong>Memo Dump</strong>
          <p>Scrawled diagrams, fragments, and hundreds of days of pocket-sized working memory.</p>
          <small>Enter the archive →</small>
        </Link>

        <Link className="compendium-collection comp-notes-card" href="/compendium/class-notes">
          <span className="eyebrow">Collection 03 / Illustrated Study</span>
          <div className="comp-notes-figure" aria-hidden="true"><i /><i /><i /></div>
          <strong>Class Notes</strong>
          <p>Handwritten college notebooks organized by course, where diagrams become their own gallery.</p>
          <small>Open the notebooks →</small>
        </Link>

        <Link className="compendium-collection comp-ruliad-card" href="/compendium/tales-from-the-ruliad">
          <span className="eyebrow">Collection 04 / Seven Stories</span>
          <div className="comp-ruliad-figure" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
          <strong>Tales from<br />the Ruliad</strong>
          <p>Seven ordered stories from a computational universe whose cosmology is wrapped in storytelling.</p>
          <small>Enter the Ruliad →</small>
        </Link>
      </section>
    </main>
  );
}
