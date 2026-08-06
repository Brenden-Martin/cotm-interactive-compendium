import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getResearchProject, researchProjects } from "../projects";

export const dynamicParams = false;

export function generateStaticParams() {
  return researchProjects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const project = getResearchProject((await params).slug);
  return {
    title: project ? `${project.title} · Private Research` : "Private Research",
    description: project?.indexNote,
  };
}

export default async function ResearchProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const project = getResearchProject((await params).slug);
  if (!project) notFound();
  const projectNumber = researchProjects.findIndex((candidate) => candidate.slug === project.slug) + 1;

  return (
    <main className={`research-project-page research-project-${projectNumber}`}>
      <header className="research-project-head">
        <Link className="back" href="/research">Private Research</Link>
        <span className="folio">Archive {String(projectNumber).padStart(2, "0")} / 03</span>
      </header>

      <section className="research-project-hero">
        <div>
          <span className="eyebrow">PhD Research Archive / Structure Reserved</span>
          <h1>{project.title}</h1>
          <p>{project.indexNote}</p>
        </div>
        <div className="research-project-signal" aria-hidden="true"><i /><i /><i /><i /><span /></div>
      </section>

      <section className="research-project-slots" aria-label="Reserved research materials">
        <article><span>01 / Narrative</span><strong>Reports &amp; Presentations</strong><p>Reserved for the project overview, major results, and selected presentation material.</p></article>
        <article><span>02 / Visual Record</span><strong>Figures &amp; Key Plots</strong><p>Reserved for the clearest diagrams, images, measurements, and publication-ready plots.</p></article>
        <article><span>03 / Working Record</span><strong>Research Notebooks</strong><p>Reserved for photographed notebook entries, apparatus sketches, and dated development notes.</p></article>
        <article><span>04 / Interactive Record</span><strong>Models &amp; Simulations</strong><p>Reserved for browser experiments and explanatory tools drawn from the project directories.</p></article>
      </section>
    </main>
  );
}
