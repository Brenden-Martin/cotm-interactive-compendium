"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

const FORTUNES = [
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

function nextFortune(previous: number) {
  if (FORTUNES.length < 2) return 0;
  let next = Math.floor(Math.random() * FORTUNES.length);
  if (next === previous) next = (next + 1 + Math.floor(Math.random() * (FORTUNES.length - 1))) % FORTUNES.length;
  return next;
}

export function FortuneCookie() {
  const [fortuneIndex, setFortuneIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [trap, setTrap] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const crackCookie = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (!open) {
      setFortuneIndex((current) => nextFortune(current));
      setOpen(true);
      return;
    }
    setOpen(false);
    timerRef.current = window.setTimeout(() => {
      setFortuneIndex((current) => nextFortune(current));
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
      <div className="fortune-stage">
        <div className="fortune-rays" aria-hidden="true" />
        <button
          className={`fortune-machine ${open ? "open" : ""}`}
          type="button"
          onClick={crackCookie}
          aria-label={open ? "Crack another fortune cookie" : "Crack the fortune cookie"}
        >
          <span className="fortune-paper"><b>{FORTUNES[fortuneIndex]}</b><i>Child of the Machine</i></span>
          <span className="cookie-half cookie-left"><i /></span>
          <span className="cookie-half cookie-right"><i /></span>
        </button>
        <button className="fortune-crack" type="button" onClick={crackCookie}>{open ? "Crack another" : "Crack the cookie"}</button>
        <p className="fortune-instruction">Tap the cookie. Accept no liability for subsequent synchronicities.</p>
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
