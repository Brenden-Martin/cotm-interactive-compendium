import Link from "next/link";
import { NonlinearDeq } from "../nonlinear-deq/nonlinear-deq";

export const metadata = {
  title: "The Luckfield",
  description: "A self-recursing nonlinear field that chooses its next boundary conditions by luck and interestingness.",
};

export default function TheLuckfieldPage() {
  return (
    <main className="deq-page luckfield-page">
      <header className="deq-head">
        <Link className="back" href="/gallery">Gallery</Link>
        <div>
          <span className="eyebrow">Interactive Exhibit 21 · Recursive Fields</span>
          <h1>The Luckfield</h1>
        </div>
        <span className="folio">COTM / SELF-SELECTING</span>
      </header>
      <NonlinearDeq recursiveBoundary />
    </main>
  );
}
