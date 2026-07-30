import Link from "next/link";
import { NonlinearDeq } from "../nonlinear-deq/nonlinear-deq";

export const metadata = {
  title: "DEQ Morph Bank",
  description: "An anonymous shared preset foundry for the nonlinear differential-equation sandbox.",
};

export default function DeqMorphBankPage() {
  return (
    <main className="deq-page deq-foundry-page">
      <header className="deq-head">
        <Link className="back" href="/gallery">Gallery</Link>
        <div>
          <span className="eyebrow">Interactive Exhibit 13 · Collective Systems</span>
          <h1>DEQ Morph Bank</h1>
        </div>
        <span className="folio">COTM / SHARED FIELD</span>
      </header>
      <NonlinearDeq presetFoundry />
    </main>
  );
}
