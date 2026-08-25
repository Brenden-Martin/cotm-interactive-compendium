import { HystereticKinetics } from "./hysteretic-kinetics";

export const metadata = {
  title: "Hysteretic Kinetics",
  description: "A live CRT kinetics laboratory for heuristic reservoirs, SRH, TAAM, and recombination-rate sweeps.",
};

export default function HystereticKineticsPage() { return <HystereticKinetics />; }
