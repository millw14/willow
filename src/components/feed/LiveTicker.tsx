"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Wish } from "@/lib/types";

export function LiveTicker() {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetch("/api/wishes?category=recent&limit=40")
      .then((r) => r.json())
      .then((d) => setWishes(d.wishes ?? []))
      .catch(() => setWishes([]));
  }, []);

  useEffect(() => {
    if (wishes.length === 0) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % wishes.length);
    }, 3600);
    return () => clearInterval(interval);
  }, [wishes]);

  if (wishes.length === 0) return null;
  const current = wishes[index];

  return (
    <div className="pointer-events-none flex items-center justify-center gap-3 overflow-hidden">
      <span className="h-1 w-1 animate-pulse rounded-full bg-glow" aria-hidden />
      <span className="eyebrow whitespace-nowrap opacity-60">a wish is being cast</span>
      <div className="relative h-6 min-w-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={current.id}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 0.9 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="font-display truncate text-base italic text-parchment/80"
          >
            “{current.wish_text}”
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
