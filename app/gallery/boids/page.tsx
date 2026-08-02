import { BoidsField } from "./boids-field";

export const metadata = {
  title: "Boids",
  description: "A windowless flocking experiment in alignment, cohesion, and separation from Child of the Machine.",
  openGraph: { images: ["/og-waveforms.png"] },
  twitter: { card: "summary_large_image", images: ["/og-waveforms.png"] },
};

export default function BoidsPage() {
  return <BoidsField />;
}
