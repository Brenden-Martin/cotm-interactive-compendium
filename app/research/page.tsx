import Link from "next/link";

export const metadata = {
  title: "Private Research",
  description: "Experiments, prototypes, recommendations, and working investigations from Child of the Machine.",
};

export default function Research() {
  return (
    <main className="page research-index-page">
      <header className="page-head"><Link className="back" href="/">Index</Link><span className="folio">Room 04 / 04</span></header>
      <h1>Private<br />Research</h1>
      <p className="page-subtitle">Working experiments, prototype instruments, unfinished questions, and the media that helped shape them.</p>

      <section className="research-grid" aria-label="Private Research collections">
        <Link className="research-card research-pendulum-card" href="/research/pendulum-lab">
          <span className="eyebrow">Experiment 01 / Nonlinear Dynamics</span>
          <div className="research-pendulum-figure" aria-hidden="true"><i /><b /><span /></div>
          <strong>Pendulum Laboratory</strong>
          <p>Compare small-angle, exact, double, and triple pendulum dynamics with live position traces.</p>
          <small>Enter the laboratory →</small>
        </Link>

        <Link className="research-card research-reading-card" href="/research/recommended-reading">
          <span className="eyebrow">Reference Shelf 01 / Influences</span>
          <div className="research-reading-figure" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <strong>Recommended Reading</strong>
          <p>Books, films, shows, channels, art, and other useful signals. The first shelf is waiting.</p>
          <small>Open the empty shelf →</small>
        </Link>
      </section>
    </main>
  );
}
