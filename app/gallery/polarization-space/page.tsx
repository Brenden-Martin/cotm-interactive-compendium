import { PolarizationLab } from "./polarization-lab";

export const metadata = {
  title: "Polarization Space",
  description: "Explore Jones vectors, waveplates, Stokes parameters, and the Poincaré sphere.",
};

export default function PolarizationPage() { return <PolarizationLab />; }
