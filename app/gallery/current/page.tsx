import { CurrentLab } from "./current-lab";

export const metadata = {
  title: "Current",
  description: "A live, doodle-driven conservative Laplace solver for watching potential and current fields converge together.",
  openGraph: { images: ["/og-waveforms.png"] },
  twitter: { card: "summary_large_image", images: ["/og-waveforms.png"] },
};

export default function CurrentPage() {
  return <CurrentLab />;
}
