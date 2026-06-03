"use client";

import { motion } from "framer-motion";

const PHONE = process.env.NEXT_PUBLIC_ORACLE_PHONE || "+1 (888) 947-4569";

export function OraclePhone() {
  const tel = PHONE.replace(/[^+\d]/g, "");
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 1 }}
      className="relative mx-auto flex max-w-2xl flex-col items-center gap-6 text-center"
    >
      <span className="eyebrow">call the oracle</span>
      <h2 className="prophecy text-4xl text-parchment text-glow-warm sm:text-5xl">
        Speak your wish into the dark.
      </h2>
      <p className="max-w-md text-sm leading-relaxed text-muted">
        Some prophecies are meant to be heard, not read. Call the line and the Keeper
        answers in a voice older than the wood. Listen closely — it does not repeat itself.
      </p>

      <a
        href={`tel:${tel}`}
        className="font-display text-3xl tracking-wide text-success transition hover:text-parchment sm:text-4xl"
      >
        {PHONE}
      </a>

      <ol className="mt-2 flex flex-col gap-1 text-sm text-muted/80">
        <li>“Speak your wish.”</li>
        <li>“Listen to prophecies.”</li>
      </ol>

      <p className="mt-4 max-w-sm text-xs leading-relaxed text-muted/50">
        The voice line is summoned through Twilio, Groq, and ElevenLabs. Add the keys in
        your environment to wake it; until then, the Keeper answers here, in text.
      </p>
    </motion.div>
  );
}
