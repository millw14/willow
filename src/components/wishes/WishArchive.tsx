"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Wish, WishCategory } from "@/lib/types";

const FILTERS: { id: WishCategory; label: string }[] = [
  { id: "recent", label: "Recent" },
  { id: "popular", label: "Popular" },
  { id: "strange", label: "Strange" },
  { id: "funny", label: "Funny" },
];

// Small deterministic offsets so cards drift organically rather than in a grid.
function offsetFor(i: number) {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12543.123;
  return {
    x: ((a - Math.floor(a)) - 0.5) * 26,
    y: ((b - Math.floor(b)) - 0.5) * 40,
    delay: ((a - Math.floor(a)) % 1) * 4,
    dur: 7 + ((b - Math.floor(b)) % 1) * 5,
  };
}

export function WishArchive() {
  const [category, setCategory] = useState<WishCategory>("recent");
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/wishes?category=${category}&limit=80`)
      .then((r) => r.json())
      .then((d) => setWishes(d.wishes ?? []))
      .catch(() => setWishes([]))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setCategory(f.id)}
            className={`eyebrow rounded-full border px-5 py-2 transition ${
              category === f.id
                ? "border-glow/60 text-parchment"
                : "border-glow/15 text-muted hover:border-glow/35"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-center text-muted">the wood is remembering…</p>}
      {!loading && wishes.length === 0 && (
        <p className="text-center text-muted">No wishes of this kind have been cast yet.</p>
      )}

      <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 [column-fill:_balance]">
        <AnimatePresence>
          {wishes.map((w, i) => {
            const o = offsetFor(i);
            return (
              <motion.div
                key={w.id}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, delay: Math.min(i * 0.02, 0.5) }}
                className="mb-6 break-inside-avoid"
                style={{ transform: `translateX(${o.x}px)` }}
              >
                <motion.article
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: o.dur, delay: o.delay, repeat: Infinity, ease: "easeInOut" }}
                  className="group relative flex flex-col gap-4 border border-glow/12 bg-gradient-to-b from-white/[0.025] to-transparent p-6 transition-colors hover:border-glow/35"
                >
                  <p className="font-display text-xl italic leading-snug text-parchment">
                    “{w.wish_text}”
                  </p>
                  {w.oracle_response && (
                    <p className="text-sm leading-relaxed text-success/80">
                      {w.oracle_response}
                    </p>
                  )}
                  <div className="mt-1 flex items-center justify-between">
                    <span className="eyebrow opacity-40">№ {w.wish_number.toLocaleString()}</span>
                    <span className="eyebrow opacity-30">{w.wallet_address.slice(0, 8)}</span>
                  </div>
                </motion.article>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
