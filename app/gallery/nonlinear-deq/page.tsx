import Link from "next/link";
import { NonlinearDeq } from "./nonlinear-deq";

export const metadata = {
  title: "Nonlinear DEQ Sandbox",
  description: "A coupled-field nonlinear differential-equation playground from Child of the Machine.",
  openGraph: { images: ["/og-deq.png"] },
  twitter: { card: "summary_large_image", images: ["/og-deq.png"] },
};

export default function NonlinearDeqPage() {
  return (
    <main className="deq-page">
      <header className="deq-head">
        <Link className="back" href="/gallery">Gallery</Link>
        <div>
          <span className="eyebrow">Interactive Exhibit 03 · Nonlinear Systems</span>
          <h1>DEQ Sandbox</h1>
        </div>
        <span className="folio">COTM / 2026</span>
      </header>
      <NonlinearDeq />
    </main>
  );
}
