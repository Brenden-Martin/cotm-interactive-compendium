import Link from "next/link";

export const metadata = { title: "Gallery" };

export default function Gallery() {
  return (
    <main className="page gallery-page">
      <header className="page-head"><Link className="back" href="/">Index</Link><span className="folio">Room 03 / 04</span></header>
      <h1>Gallery</h1>
      <p className="page-subtitle">Studies in color, balance, repetition, and the useful accident.</p>
      <section className="gallery-grid" aria-label="Visual studies">
        <article className="study"><span className="eyebrow">Study 01 / Orbit</span><div className="study-shape" /><small>Circle against field</small></article>
        <article className="study"><span className="eyebrow">Study 02 / Signal</span><div className="study-shape" /><small>Three notes held apart</small></article>
        <article className="study"><span className="eyebrow">Study 03 / Turn</span><div className="study-shape" /><small>Square refusing stillness</small></article>
      </section>
    </main>
  );
}
