import Link from "next/link";
import { Pendulum } from "../site";

export const metadata = { title: "Private Research" };

export default function Research() {
  return (
    <main className="research-page">
      <div className="research-overlay">
        <header className="page-head"><Link className="back" href="/">Index</Link><span className="folio">Room 04 / 04</span></header>
        <p className="research-caption"><b>Experiment 01: Pendulum.</b><br />Grab the blue weight, pull it away from center, and let go.</p>
      </div>
      <Pendulum />
    </main>
  );
}
