import { DiffractionLab } from "./diffraction-lab";

export const metadata = {
  title: "Square Aperture Diffraction",
  description: "An interactive Fraunhofer diffraction bench.",
};

export default function SquareAperturePage() {
  return <DiffractionLab />;
}
