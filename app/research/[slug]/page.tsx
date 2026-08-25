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

      {project.slug === "mesopyramids" && <section className="research-gallery-previews" aria-labelledby="mesopyramid-instruments">
        <header><span className="eyebrow">Interactive Record / Working Instruments</span><h2 id="mesopyramid-instruments">Related Gallery exhibits</h2><p>Open the live demonstrations that overlap the materials, transport, and optical methods surrounding the Mesopyramids work.</p></header>
        <div>
          <Link className="study research-gallery-link material-entry" href="/gallery/material-phases">
            <span className="eyebrow">Condensed Matter</span><div className="material-entry-field" aria-hidden="true"><i /><i /><i /><i /><span /></div><strong>Material Phases</strong><small>Cross the phase boundary →</small>
          </Link>
          <Link className="study research-gallery-link current-entry" href="/gallery/current">
            <span className="eyebrow">Conductive Media</span><div className="current-entry-field" aria-hidden="true"><i /><i /><i /><i /><span /></div><strong>Current</strong><small>Doodle a path →</small>
          </Link>
          <Link className="study research-gallery-link diffraction-entry" href="/gallery/square-aperture">
            <span className="eyebrow">Wave Optics</span><div className="diffraction-entry-field" aria-hidden="true"><i /></div><strong>Square Aperture</strong><small>Enter the Fourier plane →</small>
          </Link>
        </div>
      </section>}

      {project.slug === "noncontact-respiration-monitoring" && <section className="research-gallery-previews" aria-labelledby="respiration-instruments">
        <header><span className="eyebrow">Interactive Record / Working Instrument</span><h2 id="respiration-instruments">Related Gallery exhibit</h2><p>Move the light-wave sensor around a breathing torso and watch geometry, motion, noise, and acquisition reshape its return.</p></header>
        <div><Link className="study research-gallery-link respiration-entry" href="/gallery/respiration-monitor"><span className="eyebrow">Biomedical Optics</span><div className="respiration-entry-field" aria-hidden="true"><i /><i /><i /><span /></div><strong>Respiration Monitor</strong><small>Measure the moving light →</small></Link></div>
      </section>}

      {project.slug === "mesopyramids" && <section className="research-gallery-previews research-gallery-previews-kinetics" aria-labelledby="kinetics-instrument">
        <header><span className="eyebrow">Interactive Record / Kinetics Instrument</span><h2 id="kinetics-instrument">Live hysteresis laboratory</h2><p>Compare the heuristic paper model with reduced SRH, TAAM, and general recombination channels on a persistent virtual scope.</p></header>
        <div><Link className="study research-gallery-link kinetics-entry" href="/gallery/hysteretic-kinetics"><span className="eyebrow">Nonequilibrium Kinetics</span><div className="kinetics-entry-scope" aria-hidden="true"><i /><span /></div><strong>Hysteretic Kinetics</strong><small>Draw the living loop →</small></Link></div>
      </section>}

      <section className="research-project-slots" aria-label="Reserved research materials">
        <article><span>01 / Narrative</span><strong>Reports &amp; Presentations</strong><p>Reserved for the project overview, major results, and selected presentation material.</p></article>
        <article><span>02 / Visual Record</span><strong>Figures &amp; Key Plots</strong><p>Reserved for the clearest diagrams, images, measurements, and publication-ready plots.</p></article>
        <article><span>03 / Working Record</span><strong>Research Notebooks</strong><p>Reserved for photographed notebook entries, apparatus sketches, and dated development notes.</p></article>
        <article><span>04 / Interactive Record</span><strong>Models &amp; Simulations</strong><p>Reserved for browser experiments and explanatory tools drawn from the project directories.</p></article>
      </section>
    </main>
  );
}
