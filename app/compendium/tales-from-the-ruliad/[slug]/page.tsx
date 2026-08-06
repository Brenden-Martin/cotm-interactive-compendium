import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRuliadStory, ruliadStories } from "../stories";

export const dynamicParams = false;

export function generateStaticParams() {
  return ruliadStories.map((story) => ({ slug: story.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const story = getRuliadStory((await params).slug);
  return { title: story ? `${story.title} · Tales from the Ruliad` : "Tales from the Ruliad", description: story?.pitch };
}

export default async function RuliadStoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const story = getRuliadStory((await params).slug);
  if (!story) notFound();
  const index = ruliadStories.findIndex((candidate) => candidate.slug === story.slug);
  const previous = ruliadStories[index - 1];
  const next = ruliadStories[index + 1];

  return (
    <main className={`ruliad-story ruliad-story-${index + 1}`}>
      <header>
        <Link className="back" href="/compendium/tales-from-the-ruliad">Tales from the Ruliad</Link>
        <span className="folio">Story {String(index + 1).padStart(2, "0")} / 07</span>
      </header>
      <section className="ruliad-story-hero">
        <div className={`ruliad-story-art ${story.art?.length ? "has-illustration" : "is-reserved"}`}>
          <div className="ruliad-story-orbits" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          {story.art?.length ? (
            <div className={`ruliad-art-stack ruliad-art-stack-${story.art.length}`}>
              {story.art.map((illustration) => (
                <figure className={`ruliad-art-frame ruliad-art-${illustration.fit ?? "contain"}`} key={illustration.src}>
                  <Image src={illustration.src} alt={illustration.alt} fill sizes="(max-width: 760px) 88vw, 38vw" unoptimized />
                </figure>
              ))}
            </div>
          ) : <span className="ruliad-art-awaiting">Illustration to follow</span>}
          <div className="ruliad-art-caption"><span>Story signal</span><p>{story.pitch}</p></div>
        </div>
        <div>
          <span className="eyebrow">Tales from the Ruliad</span>
          <h1>{story.title}</h1>
          <p>{story.art?.length ? "Archive illustration installed; the geometric field remains in orbit while the manuscript follows." : "This reading room is ready for its illustration and edited text."}</p>
        </div>
      </section>
      <section className="ruliad-manuscript-slot">
        <span className="eyebrow">Manuscript slot</span>
        <h2>Awaiting publication material</h2>
        <p>The page structure is intentionally quiet until the story text and its selected artwork are supplied.</p>
      </section>
      <nav className="ruliad-story-nav" aria-label="Tales from the Ruliad story order">
        {previous ? <Link href={`/compendium/tales-from-the-ruliad/${previous.slug}`}>← {previous.title}</Link> : <span />}
        {next ? <Link href={`/compendium/tales-from-the-ruliad/${next.slug}`}>{next.title} →</Link> : <Link href="/compendium/tales-from-the-ruliad">Story index →</Link>}
      </nav>
    </main>
  );
}
