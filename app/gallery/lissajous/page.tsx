import { LissajousScope } from "./lissajous-scope";

export const metadata = {
  title: "Lissajous Scope",
  description: "A live phosphor-trace Lissajous oscilloscope from Child of the Machine.",
  openGraph: { images: ["/og-waveforms.png"] },
  twitter: { card: "summary_large_image", images: ["/og-waveforms.png"] },
};

export default function LissajousPage() {
  return <LissajousScope />;
}
