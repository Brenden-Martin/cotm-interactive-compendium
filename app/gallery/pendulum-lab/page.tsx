import Link from "next/link";
import { PendulumLab } from "../../research/pendulum-lab/pendulum-lab";

export const metadata = {
  title: "Pendulum Laboratory · Gallery",
  description: "Compare small-angle, exact, double, and triple pendulum dynamics with live position traces.",
};

export default function PendulumLabPage() {
  return (
    <main className="pendulum-lab-page">
      <header className="pendulum-lab-head">
        <Link className="back" href="/gallery">Gallery</Link>
        <div><span className="eyebrow">Exhibit 20 · Nonlinear Dynamics</span><h1>Pendulum Laboratory</h1></div>
        <span className="folio">COTM / G-20</span>
      </header>
      <PendulumLab />
    </main>
  );
}
