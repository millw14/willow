"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber } from "@/lib/utils";

export function WishCounter() {
  const [target, setTarget] = useState<number | null>(null);
  const [display, setDisplay] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    let mounted = true;
    fetch("/api/wishes/count")
      .then((r) => r.json())
      .then((d) => {
        if (mounted && typeof d.count === "number") setTarget(d.count);
      })
      .catch(() => setTarget(143_921));
    // gentle live drip
    const interval = setInterval(() => {
      setTarget((t) => (t === null ? t : t + Math.floor(Math.random() * 3)));
    }, 9000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (target === null) return;
    const start = display;
    const delta = target - start;
    if (delta === 0) return;
    const startTime = performance.now();
    const duration = delta > 50 ? 1800 : 700;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + delta * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span
        className="font-display text-4xl font-light tabular-nums tracking-tight text-parchment text-glow-warm sm:text-5xl"
        aria-live="polite"
      >
        {formatNumber(display)}
      </span>
      <span className="eyebrow">Wishes Cast</span>
    </div>
  );
}
