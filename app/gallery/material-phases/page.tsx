import { MaterialPhasesLab } from "./material-phases-lab";

export const metadata = {
  title: "Material Phases",
  description: "A dual-screen laboratory for magnetic ordering, steel grains, Au-Si eutectics, and the pressure-temperature phases of water.",
  openGraph: { images: ["/og-waveforms.png"] },
  twitter: { card: "summary_large_image", images: ["/og-waveforms.png"] },
};

export default function MaterialPhasesPage() {
  return <MaterialPhasesLab />;
}
