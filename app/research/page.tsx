import Link from "next/link";
import { researchProjects } from "./projects";

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
        {researchProjects.map((project, index) => (
          <Link className={`research-card research-project-card research-${project.slug}-card`} href={`/research/${project.slug}`} key={project.slug}>
            <span className="eyebrow">Research Archive {String(index + 1).padStart(2, "0")} / PhD Work</span>
            <div className="research-project-figure" aria-hidden="true"><i /><i /><i /><span /></div>
            <strong>{project.title}</strong>
            <p>{project.indexNote}</p>
            <small>Open the reserved archive →</small>
          </Link>
        ))}

        <Link className="research-card research-reading-card" href="/research/recommended-reading">
          <span className="eyebrow">Reference Shelf / Influences</span>
          <div className="research-reading-figure" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <strong>Recommended Reading</strong>
          <p>Books, films, shows, channels, art, and other useful signals. The first shelf is waiting.</p>
          <small>Open the empty shelf →</small>
        </Link>
      </section>
    </main>
  );
}
