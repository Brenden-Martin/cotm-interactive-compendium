import { PhaseMarch } from "./phase-march";

export const metadata = {
  title: "Phase March",
  description: "Paint an unwrapped phase field, then watch identical local clocks organize themselves into traveling waves.",
};

export default function Page() {
  return <PhaseMarch />;
}
