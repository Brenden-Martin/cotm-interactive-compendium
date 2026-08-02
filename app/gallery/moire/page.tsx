import { MoireField } from "./moire-field";

export const metadata = {
  title: "Moiré Field",
  description: "A red optical tabletop of draggable gratings, printouts, blur glass, and fisheye distortion from Child of the Machine.",
  openGraph: { images: ["/og-waveforms.png"] },
  twitter: { card: "summary_large_image", images: ["/og-waveforms.png"] },
};

export default function MoirePage() {
  return <MoireField />;
}
