"use client";

import Link from "next/link";
import { CSSProperties, FormEvent, useEffect, useRef, useState } from "react";
import { ARCHIVED_FORTUNES } from "./fortune-bank";

const STARTER_FORTUNES = [
  "The shortest path will develop an unexpected scenic route.",
  "A small machine is thinking fondly of you.",
  "Your next useful mistake is already warming up.",
  "Today is an excellent day to misunderstand something beautifully.",
  "An elegant solution will arrive dressed as a terrible idea.",
  "You will soon discover a knob that should not have been left unlabeled.",
  "The universe has reviewed your request and added more variables.",
  "A mysterious attractor lies just beyond your current parameter range.",
  "The noise is trying to tell you about the signal.",
  "Someone nearby is about to say, ‘What if we turn it all the way up?’",
  "Your approximation is valid in a surprisingly charming neighborhood.",
  "The missing piece is currently pretending to be irrelevant.",
  "A good question will outlive three excellent answers.",
  "You are under no obligation to keep the axes orthogonal.",
  "Soon, a coincidence will insist that it was a design decision.",
  "The experiment succeeds whenever it becomes more interesting than the hypothesis.",
  "Beware of solutions that cannot survive a second cup of coffee.",
  "A very serious graph is preparing to do something ridiculous.",
  "Your future contains at least one unnecessary but delightful button.",
  "The machine requests patience and a slightly larger timestep.",
  "Wherever you go, there your boundary conditions are.",
  "The answer is stable, but only in the numerical sense.",
  "You will be followed home by an unusually persuasive metaphor.",
  "Congratulations: the bug has become an exhibit.",
];

const LOCAL_FORTUNES = [...STARTER_FORTUNES, ...ARCHIVED_FORTUNES];

const DISSOLVE_BLOCKS = Array.from({ length: 64 }, (_, index) => {
  const scramble = (seed: number) => ((seed * 9301 + 49297) % 233280) / 233280;
  const direction = index % 2 ? 1 : -1;
  return {
    "--block-x": `${Math.floor(scramble(index * 11 + 3) * 96)}%`,
    "--block-y": `${Math.floor(scramble(index * 17 + 7) * 96)}%`,
    "--block-w": `${5 + Math.floor(scramble(index * 23 + 5) * 20)}vw`,
    "--block-h": `${3 + Math.floor(scramble(index * 29 + 9) * 16)}vh`,
    "--block-dx": `${direction * (12 + Math.floor(scramble(index * 31 + 4) * 58))}vw`,
    "--block-dy": `${18 + Math.floor(scramble(index * 37 + 2) * 90)}vh`,
    "--block-rot": `${direction * (20 + Math.floor(scramble(index * 41 + 8) * 220))}deg`,
    "--block-delay": `${(index % 13) * .055}s`,
    "--block-duration": `${1.45 + scramble(index * 43 + 6) * 1.8}s`,
    "--block-hue": `${Math.floor(scramble(index * 47 + 1) * 330)}deg`,
  } as CSSProperties;
});

function nextFortune(previous: number, bankSize: number) {
  if (bankSize < 2) return 0;
  let next = Math.floor(Math.random() * bankSize);
  if (next === previous) next = (next + 1 + Math.floor(Math.random() * (bankSize - 1))) % bankSize;
  return next;
}

export function FortuneCookie() {
  const [fortuneIndex, setFortuneIndex] = useState(0);
  const [fortunes, setFortunes] = useState<string[]>(LOCAL_FORTUNES);
  const [open, setOpen] = useState(false);
  const [golden, setGolden] = useState(false);
  const [password, setPassword] = useState("");
  const [secretMessage, setSecretMessage] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [trap, setTrap] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    const active = golden && open;
    document.body.classList.toggle("fortune-golden-dissolve", active);
    return () => document.body.classList.remove("fortune-golden-dissolve");
  }, [golden, open]);

  useEffect(() => {
    let active = true;
    fetch("/api/fortune-suggestions", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((result: { fortunes?: unknown }) => {
        if (!active || !Array.isArray(result.fortunes)) return;
        const unique = new Set(LOCAL_FORTUNES);
        const approved = result.fortunes.filter((fortune): fortune is string =>
          typeof fortune === "string" && fortune.length >= 3 && fortune.length <= 240
        );
        for (const fortune of approved) unique.add(fortune);
        setFortunes(Array.from(unique));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const crackCookie = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (!open) {
      const foundGoldenTicket = Math.random() < 1 / 250;
      setGolden(foundGoldenTicket);
      if (!foundGoldenTicket) setFortuneIndex((current) => nextFortune(current, fortunes.length));
      setOpen(true);
      return;
    }
    setOpen(false);
    timerRef.current = window.setTimeout(() => {
      const foundGoldenTicket = Math.random() < 1 / 250;
      setGolden(foundGoldenTicket);
      if (!foundGoldenTicket) setFortuneIndex((current) => nextFortune(current, fortunes.length));
      setOpen(true);
      timerRef.current = null;
    }, 420);
  };

  const tryPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.trim().toUpperCase() !== "STAY GOLDEN") {
      setSecretMessage("Nothing happens. Probably.");
      return;
    }
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setPassword("");
    setSecretMessage("A concealed mechanism accepts your answer.");
    setOpen(false);
    timerRef.current = window.setTimeout(() => {
      setGolden(true);
      setOpen(true);
      timerRef.current = null;
    }, 420);
  };

  const submitSuggestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fortune = suggestion.trim();
    if (fortune.length < 3) {
      setMessage("Give the oracle at least three characters to work with.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/fortune-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fortune, website: trap }),
      });
      const result = await response.json() as { saved?: boolean; duplicate?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error || "The oracle misplaced that one.");
      setSuggestion("");
      setMessage(result.duplicate
        ? "That fortune is already waiting in the review queue. Excellent instincts."
        : "Saved for review. It has not been added to the public cookie bank.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The suggestion box is unavailable just now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="fortune-lab">
      {golden && open ? (
        <div className="golden-dissolve-field" aria-hidden="true">
          {DISSOLVE_BLOCKS.map((style, index) => <i key={index} style={style} />)}
        </div>
      ) : null}
      <div className="fortune-stage">
        <div className="fortune-rays" aria-hidden="true" />
        <div
          className={`fortune-machine ${open ? "open" : ""} ${golden ? "golden" : ""}`}
        >
          <button className="fortune-cookie-trigger" type="button" onClick={crackCookie} aria-label={open ? "Crack another fortune cookie" : "Crack the fortune cookie"} />
          {golden ? (
            <Link className="fortune-paper golden-ticket-link" href="/the-outernet" aria-label="Use the Golden Ticket to enter The Outernet">
              <b>ADMIT ONE<br />THE OUTERNET</b>
              <i>Golden Ticket · Child of the Machine</i>
              <em>Touch ticket to depart</em>
            </Link>
          ) : (
            <span className="fortune-paper">
              <b>{fortunes[fortuneIndex] ?? LOCAL_FORTUNES[0]}</b>
              <i>Child of the Machine</i>
            </span>
          )}
          <span className="cookie-half cookie-left"><i /></span>
          <span className="cookie-half cookie-right"><i /></span>
        </div>
        <button className="fortune-crack" type="button" onClick={crackCookie}>{open ? "Crack another" : "Crack the cookie"}</button>
        <p className="fortune-instruction">Tap the cookie. Accept no liability for subsequent synchronicities.</p>
        <form className="fortune-secret" onSubmit={tryPassword}>
          <input aria-label="Mysterious password" autoComplete="off" placeholder="Password" value={password} onChange={(event) => { setPassword(event.target.value); setSecretMessage(""); }} />
          <button type="submit" aria-label="Try the mysterious password">???</button>
        </form>
        <p className="fortune-secret-message" role="status" aria-live="polite">{secretMessage}</p>
      </div>
      <aside className="fortune-suggestion">
        <span className="eyebrow">Feed the oracle</span>
        <h2>Suggest a future fortune</h2>
        <p>Send a line to the private review queue. Suggestions never enter the cookie automatically; we can inspect and deliberately curate them later.</p>
        <form onSubmit={submitSuggestion}>
          <label htmlFor="fortune-suggestion">Your proposed wisdom, nonsense, or suspiciously specific warning</label>
          <textarea
            id="fortune-suggestion"
            maxLength={240}
            rows={5}
            value={suggestion}
            onChange={(event) => { setSuggestion(event.target.value); setMessage(""); }}
            placeholder="You will soon encounter a very persuasive ellipse…"
          />
          <div className="fortune-form-meta"><span>{suggestion.length} / 240</span><span>Pending review only</span></div>
          <label className="fortune-trap" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={trap} onChange={(event) => setTrap(event.target.value)} /></label>
          <button type="submit" disabled={submitting || suggestion.trim().length < 3}>{submitting ? "Folding…" : "Submit fortune"}</button>
        </form>
        <p className="fortune-message" role="status" aria-live="polite">{message}</p>
      </aside>
    </section>
  );
}
