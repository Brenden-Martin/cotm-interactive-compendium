import Link from "next/link";

export const metadata = {
  title: "Recommended Reading · Private Research",
  description: "A reserved reference shelf for books, films, shows, channels, art, and other influences.",
};

const shelves = ["Books", "Movies", "Shows", "YouTube", "Art", "Other Signals"];

export default function RecommendedReadingPage() {
  return (
    <main className="reading-room-page">
      <header className="reading-room-head"><Link className="back" href="/research">Private Research</Link><span className="folio">Reference Shelf 01 / Influences</span></header>
      <section className="reading-room-title">
        <span className="eyebrow">Reference shelf</span>
        <h1>Recommended<br />Reading</h1>
        <p>Books, movies, shows, YouTube channels, art, and other works worth pointing toward. Deliberately empty until the first curated list arrives.</p>
      </section>
      <section className="reading-shelves" aria-label="Recommended Reading categories">
        {shelves.map((shelf, index) => (
          <article key={shelf}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{shelf}</strong>
            <small>Awaiting recommendations</small>
          </article>
        ))}
      </section>
    </main>
  );
}
