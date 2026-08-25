import { RespirationMonitor } from "./respiration-monitor";

export const metadata = {
  title: "Respiration Monitor",
  description: "A draggable light-wave sensing experiment with stochastic breathing and a live optical return trace.",
};

export default function RespirationMonitorPage() { return <RespirationMonitor />; }
