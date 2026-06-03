"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function randomGlyph(): string {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

function StableLetters({
  text,
  className,
  ariaLabel,
}: {
  text: string;
  className?: string;
  ariaLabel: string;
}) {
  return (
    <span className={className} aria-label={ariaLabel}>
      {text.split("").map((char, i) =>
        char === " " ? (
          <span key={i} className="inline-block w-[0.35em]" aria-hidden>
            {" "}
          </span>
        ) : (
          <span key={i} className="inline-block w-[0.62em] text-center" aria-hidden>
            {char}
          </span>
        ),
      )}
    </span>
  );
}

/**
 * Every character slot flips on its own timer — all letters switching at once,
 * never whole words or phrases swapping.
 */
export function LoadingLetters({
  text = "ONE WISH WILLOW",
  className,
}: {
  text?: string;
  className?: string;
}) {
  const chars = useRef(text.split(""));
  const slots = useRef(chars.current.map((c) => (c === " " ? " " : randomGlyph())));
  const [display, setDisplay] = useState(() => slots.current.join(""));

  useEffect(() => {
    chars.current = text.split("");
    slots.current = chars.current.map((c) => (c === " " ? " " : randomGlyph()));
    setDisplay(slots.current.join(""));

    const timers: number[] = [];

    chars.current.forEach((char, i) => {
      if (char === " ") return;
      // Each letter flips at its own pace — staggered phases, all active.
      const ms = 38 + (i * 23) % 47;
      timers.push(
        window.setInterval(() => {
          slots.current[i] = randomGlyph();
          setDisplay(slots.current.join(""));
        }, ms),
      );
    });

    return () => timers.forEach((t) => window.clearInterval(t));
  }, [text]);

  return <StableLetters className={className} text={display} ariaLabel={text} />;
}

/**
 * One line decrypts left-to-right: each letter flickers fast, locks, next letter.
 */
export function DecryptLine({
  text,
  flickerMs = 38,
  ticksPerLetter = 5,
  onComplete,
  className,
}: {
  text: string;
  flickerMs?: number;
  ticksPerLetter?: number;
  onComplete?: () => void;
  className?: string;
}) {
  const [display, setDisplay] = useState("");
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    doneRef.current = false;
    const chars = text.split("");

    function firstUnlocked(from: number) {
      for (let i = from; i < chars.length; i++) {
        if (chars[i] !== " ") return i;
      }
      return -1;
    }

    let lockedThrough = 0;
    let active = firstUnlocked(0);
    let flicker = 0;
    let cancelled = false;

    const render = (activeIdx: number, glyph: string) =>
      chars
        .map((c, i) => {
          if (c === " ") return " ";
          if (i < lockedThrough) return c;
          if (i === activeIdx) return glyph;
          return randomGlyph();
        })
        .join("");

    setDisplay(render(active, randomGlyph()));

    const id = window.setInterval(() => {
      if (cancelled) return;

      if (active < 0) {
        if (!doneRef.current) {
          doneRef.current = true;
          onCompleteRef.current?.();
        }
        return;
      }

      setDisplay(render(active, randomGlyph()));
      flicker += 1;

      if (flicker >= ticksPerLetter) {
        flicker = 0;
        lockedThrough = active + 1;
        active = firstUnlocked(lockedThrough);
      }
    }, flickerMs);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [text, flickerMs, ticksPerLetter]);

  return <StableLetters className={className} text={display || text} ariaLabel={text} />;
}

/** Idle prophecy — lines decrypt letter-by-letter, never pop in whole. */
export function DecryptSequence({
  lines,
  className,
  onComplete,
}: {
  lines: string[];
  className?: string;
  onComplete?: () => void;
}) {
  const [lineIndex, setLineIndex] = useState(0);

  if (lineIndex >= lines.length) {
    return null;
  }

  return (
    <DecryptLine
      key={lineIndex}
      text={lines[lineIndex]}
      className={className}
      onComplete={() => {
        const next = lineIndex + 1;
        if (next >= lines.length) onComplete?.();
        else setLineIndex(next);
      }}
    />
  );
}

export function ScrambleText({
  text,
  resolve = 1,
  className,
}: {
  text: string;
  resolve?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (resolve >= 1) {
      setDisplay(text);
      return;
    }
    let raf = 0;
    const tick = () => {
      setDisplay(
        text
          .split("")
          .map((char, i) => {
            if (char === " ") return " ";
            if (resolve >= i / text.length + 0.08) return char;
            return randomGlyph();
          })
          .join(""),
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, resolve]);

  return <StableLetters className={className} text={display} ariaLabel={text} />;
}
