import { RatzField } from "./ratz-field";

export const metadata = {
  title: "Ratz",
  description: "A stochastic animal-motion laboratory of scent, pursuit, panic, and fear memory from Child of the Machine.",
  openGraph: { images: ["/og-waveforms.png"] },
  twitter: { card: "summary_large_image", images: ["/og-waveforms.png"] },
};

export default function RatzPage() {
  return <RatzField />;
}
