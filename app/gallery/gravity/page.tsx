import Link from "next/link";
import { GravitySim } from "./gravity-sim";

export const metadata = {
  title: "Gravity Study",
  description: "An interactive two- and three-body gravity simulator from Child of the Machine.",
};

export default function GravityPage() {
  return (
    <main className="gravity-page">
      <header className="gravity-head">
        <Link className="back" href="/gallery">Gallery</Link>
        <div>
          <span className="eyebrow">Interactive Exhibit 01</span>
          <h1>Gravity Study</h1>
        </div>
        <span className="folio">COTM / 2026</span>
      </header>
      <GravitySim />
    </main>
  );
}
