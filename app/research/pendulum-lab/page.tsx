import Link from "next/link";
import { PendulumLab } from "./pendulum-lab";

export const metadata = {
  title: "Pendulum Laboratory · Private Research",
  description: "Compare small-angle, exact, double, and triple pendulum dynamics with live position traces.",
};

export default function PendulumLabPage() {
  return (
    <main className="pendulum-lab-page">
      <header className="pendulum-lab-head">
        <Link className="back" href="/research">Private Research</Link>
        <div><span className="eyebrow">Experiment 01 · Nonlinear Dynamics</span><h1>Pendulum Laboratory</h1></div>
        <span className="folio">COTM / R-01</span>
      </header>
      <PendulumLab />
    </main>
  );
}
