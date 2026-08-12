import Link from "next/link";
import { ChildMachineTerminal } from "./terminal";

export const metadata = {
  title: "Child of the Machine Terminal",
  description: "An interactive reconstruction of the original Child of the Machine computer poster.",
};

export default function ChildOfTheMachineTerminalPage() {
  return (
    <main className="music-terminal-page">
      <header className="music-track-head terminal-head">
        <Link className="back" href="/music">Music</Link>
        <span className="folio">Listening Room 03 / Poster Instrument</span>
      </header>
      <section className="terminal-intro">
        <span className="eyebrow">Man Made Machine | Machine Made Man</span>
        <h1>Child of the Machine Terminal</h1>
        <p>The computer from the original high-school poster, rebuilt as a playable object. Press its keys. The screen remembers each interruption differently.</p>
      </section>
      <ChildMachineTerminal />
    </main>
  );
}
