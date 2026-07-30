import { CatenaryLab } from "./catenary-lab";

export const metadata = {
  title: "Catenary Lab",
  description: "Compare an emergent spring-chain catenary with its hyperbolic-cosine solution.",
  openGraph: { images: ["/og-waveforms.png"] },
  twitter: { card: "summary_large_image", images: ["/og-waveforms.png"] },
};

export default function CatenaryPage() {
  return <CatenaryLab />;
}
