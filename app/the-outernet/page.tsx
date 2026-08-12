import Link from "next/link";

export const metadata = {
  title: "The Outernet",
  description: "A future construction site beyond the Child of the Machine.",
};

export default function TheOuternetPage() {
  return (
    <main className="outernet-page">
      <div className="outernet-construction-art" aria-hidden="true" />
      <div className="outernet-interference" aria-hidden="true" />
      <Link className="outernet-home" href="/">Return to the homepage</Link>
      <section className="outernet-sign">
        <span>Golden ticket terminus / entrance under revision</span>
        <h1>The<br />Outernet</h1>
        <p>SITE OF FUTURE CONSTRUCTION</p>
      </section>
    </main>
  );
}
