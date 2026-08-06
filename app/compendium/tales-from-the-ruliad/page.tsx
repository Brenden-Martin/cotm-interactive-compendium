import Link from "next/link";
import { ruliadStories } from "./stories";

export const metadata = {
  title: "Tales from the Ruliad · The Compendium",
  description: "Seven ordered stories from a computational universe whose cosmology is wrapped in storytelling.",
};

export default function TalesFromTheRuliadPage() {
  return (
    <main className="ruliad-index">
      <header className="ruliad-head">
        <Link className="back" href="/compendium">Compendium</Link>
        <span className="folio">Collection 04 / Seven Stories</span>
      </header>
      <section className="ruliad-intro">
        <span className="eyebrow">A computational universe</span>
        <h1>Tales from<br />the Ruliad</h1>
        <p>Seven stories arranged from first assumptions to the end of time. Text and illustrated headers will enter this structure as their publication forms are prepared.</p>
      </section>
      <ol className="ruliad-story-list">
        {ruliadStories.map((story, index) => (
          <li key={story.slug}>
            <Link href={`/compendium/tales-from-the-ruliad/${story.slug}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{story.title}</strong>
              <small>Story and art reserved →</small>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
