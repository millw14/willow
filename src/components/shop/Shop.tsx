"use client";

import { motion } from "framer-motion";

interface Artifact {
  name: string;
  catalogue: string;
  provenance: string;
  description: string;
  price: string;
  status: "available" | "vault";
}

const ARTIFACTS: Artifact[] = [
  {
    name: "The One Wish Willow",
    catalogue: "OWW · 001",
    provenance: "Original artifact · pressed paper, snap-core",
    description:
      "The object itself. Hold it at both ends. Make your wish. Pull. It only works once, and everyone knows it.",
    price: "$24",
    status: "available",
  },
  {
    name: "Wish Cards",
    catalogue: "OWW · 014",
    provenance: "Set of nine · letterpress, gold ash ink",
    description:
      "Nine blank prophecies waiting for a hand. Write a wish for someone who hasn't found the Willow yet.",
    price: "$18",
    status: "available",
  },
  {
    name: "Collector's Edition",
    catalogue: "OWW · 000",
    provenance: "Numbered to 500 · boxed, sealed, certified",
    description:
      "A single Willow entombed in a glass reliquary, with a hand-numbered certificate and the first prophecy ever recorded.",
    price: "$140",
    status: "vault",
  },
  {
    name: "The Next Curiosity",
    catalogue: "OWW · ???",
    provenance: "Unannounced · kept in the dark",
    description:
      "Something is being made. The Keeper will not say what. Leave your name on the door and you may be told first.",
    price: "—",
    status: "vault",
  },
];

export function Shop({ compact = false }: { compact?: boolean }) {
  const items = compact ? ARTIFACTS.slice(0, 2) : ARTIFACTS;
  return (
    <div className={compact ? "grid gap-6 sm:grid-cols-2" : "grid gap-8 sm:grid-cols-2"}>
      {items.map((a, i) => (
        <motion.article
          key={a.catalogue}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, delay: i * 0.08 }}
          className="group relative flex flex-col gap-4 border border-glow/12 bg-gradient-to-b from-white/[0.02] to-transparent p-8 transition-colors hover:border-glow/35"
        >
          <div className="flex items-center justify-between">
            <span className="eyebrow">{a.catalogue}</span>
            <span className="eyebrow opacity-50">
              {a.status === "vault" ? "in the vault" : "available"}
            </span>
          </div>

          {/* exhibit "pedestal" */}
          <div className="relative my-4 flex h-44 items-center justify-center overflow-hidden">
            <div
              className="absolute bottom-0 h-24 w-44 rounded-[50%] blur-2xl"
              style={{ background: "radial-gradient(closest-side, rgba(217,163,95,0.35), transparent)" }}
              aria-hidden
            />
            <img
              src="/willow-product.png"
              alt={a.name}
              className="relative max-h-44 w-auto object-contain opacity-90 mix-blend-screen transition-transform duration-700 group-hover:scale-105"
              draggable={false}
            />
          </div>

          <h3 className="font-display text-2xl text-parchment">{a.name}</h3>
          <p className="eyebrow opacity-60">{a.provenance}</p>
          <p className="text-sm leading-relaxed text-muted">{a.description}</p>
          <div className="mt-2 flex items-center justify-between border-t border-glow/10 pt-4">
            <span className="font-display text-xl text-success">{a.price}</span>
            <span className="eyebrow opacity-60 transition group-hover:opacity-100">
              {a.status === "vault" ? "ask the keeper →" : "acquire →"}
            </span>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
