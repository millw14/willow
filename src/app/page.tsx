"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ParticleField } from "@/components/scene/ParticleField";
import { LandingExperience } from "@/components/landing/LandingExperience";
import { FloatingBox } from "@/components/scene/FloatingBox";
import { WishRitual } from "@/components/wish/WishRitual";
import { WishCounter } from "@/components/counter/WishCounter";
import { LiveTicker } from "@/components/feed/LiveTicker";
import { Shop } from "@/components/shop/Shop";
import { OraclePhone } from "@/components/oracle/OraclePhone";
import { TopBar, SiteFooter } from "@/components/layout/SiteChrome";

export default function Home() {
  const [entered, setEntered] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [showRitual, setShowRitual] = useState(false);
  const [warmth, setWarmth] = useState(0);

  const intensity = showRitual ? Math.max(0.5, warmth) : entered ? 0.25 : 0;

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <ParticleField intensity={intensity} />

      {showLanding && (
        <LandingExperience
          onEnter={() => setEntered(true)}
          onComplete={() => setShowLanding(false)}
        />
      )}

      <AnimatePresence>
        {showRitual && (
          <WishRitual key="ritual" onClose={() => setShowRitual(false)} onWarmth={setWarmth} />
        )}
      </AnimatePresence>

      {entered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showRitual ? 0 : 1 }}
          transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
          className="relative z-10"
          aria-hidden={showRitual}
          style={{ pointerEvents: showRitual ? "none" : undefined }}
        >
          {!showRitual && <TopBar />}

          {/* ── HERO ── */}
          <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-24">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="w-full max-w-3xl"
            >
              <FloatingBox warmth={0.25} className="mx-auto w-[72%]" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.4, delay: 0.6 }}
              className="prophecy mt-8 text-center text-4xl text-parchment text-glow-warm sm:text-6xl"
            >
              Everyone gets one wish.
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.4, delay: 1 }}
              className="mt-12 flex flex-col items-center gap-8"
            >
              <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-4">
                <button className="btn-ritual w-full sm:w-auto" onClick={() => setShowRitual(true)}>
                  Make a wish
                </button>
                <Link href="/wishes" className="btn-ritual w-full text-center sm:w-auto">
                  Read wishes
                </Link>
                <Link href="/shop" className="btn-ritual w-full text-center sm:w-auto">
                  Visit the shop
                </Link>
              </div>

              <div className="mt-6">
                <WishCounter />
              </div>

              <div className="mt-2 w-full max-w-xl px-4">
                <LiveTicker />
              </div>
            </motion.div>

            <motion.div
              className="absolute bottom-8 left-1/2 -translate-x-1/2"
              animate={{ opacity: [0.2, 0.7, 0.2], y: [0, 6, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <span className="eyebrow">scroll into the dark</span>
            </motion.div>
          </section>

          {/* ── SHOP PREVIEW ── */}
          <section className="relative mx-auto max-w-5xl px-6 py-28">
            <div className="mb-12 text-center">
              <span className="eyebrow">the curiosity shop</span>
              <h2 className="prophecy mt-4 text-4xl text-parchment sm:text-5xl">
                Artifacts kept under glass.
              </h2>
            </div>
            <Shop compact />
            <div className="mt-10 text-center">
              <Link href="/shop" className="btn-ritual">
                Enter the shop
              </Link>
            </div>
          </section>

          {/* ── ORACLE PHONE ── */}
          <section className="relative px-6 py-28">
            <OraclePhone />
          </section>

          <SiteFooter />
        </motion.div>
      )}
    </main>
  );
}
