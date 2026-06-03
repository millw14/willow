"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { FloatingBox, type BoxState } from "@/components/scene/FloatingBox";
import { WalletButton } from "@/components/ui/WalletButton";
import { useWishStatus } from "@/hooks/useWishStatus";
import { ShareCard } from "@/components/share/ShareCard";
import { wishHash, sleep, truncateAddress } from "@/lib/utils";
import type { CreateWishResult } from "@/lib/types";
import * as sound from "@/lib/sound";

type Phase = "gate" | "write" | "sequence" | "revealed" | "remembers";

interface WishRitualProps {
  onClose: () => void;
  onWarmth?: (warmth: number) => void;
}

export function WishRitual({ onClose, onWarmth }: WishRitualProps) {
  const { connected, publicKey, disconnecting } = useWallet();
  const { address, status, refresh, setStatus } = useWishStatus();
  const [phase, setPhase] = useState<Phase>("gate");
  const [text, setText] = useState("");
  const [boxState, setBoxState] = useState<BoxState>("float");
  const [sequenceStep, setSequenceStep] = useState(0);
  const [oracle, setOracle] = useState<string | null>(null);
  const [wishNumber, setWishNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const submittingRef = useRef(false);

  const warmth = useMemo(() => Math.min(1, text.length / 90), [text.length]);

  useEffect(() => {
    onWarmth?.(phase === "write" ? warmth : phase === "sequence" ? 1 : 0);
  }, [warmth, phase, onWarmth]);

  // Lock scroll while the ritual is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Move through the gate once connected, honoring the one-wish rule.
  useEffect(() => {
    if (!connected || !address) {
      setPhase("gate");
      return;
    }
    if (status === null) return; // still loading
    if (status.hasWished) {
      setBoxState("broken");
      setPhase("remembers");
      setOracle(status.wish?.oracle_response ?? null);
      setWishNumber(status.wish?.wish_number ?? null);
      sound.dryCrack();
    } else if (phase === "gate") {
      setPhase("write");
      sound.chime(660);
    }
  }, [connected, address, status, phase]);

  const handleType = useCallback((value: string) => {
    setText(value);
    if (value.length > text.length && value.length % 2 === 0) sound.whisper();
  }, [text.length]);

  const runSequence = useCallback(async () => {
    if (submittingRef.current || !address) return;
    submittingRef.current = true;
    setError(null);
    setPhase("sequence");

    // Begin the offering in the background immediately.
    const offering = fetch("/api/wishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: address,
        wish: text.trim(),
        wish_hash: await wishHash(`${address}:${text.trim()}`),
      }),
    })
      .then((r) => r.json() as Promise<CreateWishResult>)
      .catch(() => ({ ok: false, alreadyWished: false, error: "The wood is silent." }) as CreateWishResult);

    // Step 1 — screen darkens, particles gather
    setSequenceStep(1);
    await sleep(1300);

    // Step 2 — the willow bends, sound builds
    setSequenceStep(2);
    setBoxState("tense");
    sound.rumble(2.6);
    await sleep(2600);

    // Step 3 — pause, complete silence
    setSequenceStep(3);
    await sleep(1100);

    // Step 4 — SNAP
    setSequenceStep(4);
    setBoxState("snapping");
    sound.snap();
    setShake(true);
    await sleep(420);
    setBoxState("broken");
    setShake(false);
    await sleep(700);

    // Step 5 — calm
    setSequenceStep(5);
    await sleep(1100);

    // Step 6 — the oracle speaks
    const result = await offering;
    if (!result.ok && result.alreadyWished) {
      await refresh();
      setPhase("remembers");
      submittingRef.current = false;
      return;
    }
    if (!result.ok) {
      setError(result.error ?? "The wish slipped away.");
      setBoxState("float");
      setPhase("write");
      submittingRef.current = false;
      return;
    }

    setOracle(result.oracle ?? result.wish?.oracle_response ?? null);
    setWishNumber(result.wish?.wish_number ?? null);
    if (result.wish) {
      setStatus({
        hasWished: true,
        wish: {
          wish_text: result.wish.wish_text,
          oracle_response: result.wish.oracle_response,
          wish_number: result.wish.wish_number,
          created_at: result.wish.created_at,
        },
      });
    }
    setSequenceStep(6);
    setPhase("revealed");
    sound.chime(880);
    submittingRef.current = false;
  }, [address, text, refresh, setStatus]);

  const displayedWish = status?.wish?.wish_text ?? text;

  const compactBox = phase === "write" || phase === "gate";

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto overscroll-contain"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      role="dialog"
      aria-modal="true"
      aria-label="Make a wish"
    >
      {/* Solid backdrop — keeps the hero from bleeding through */}
      <motion.div
        className="pointer-events-none fixed inset-0 bg-ink"
        aria-hidden
        animate={{
          opacity:
            phase === "sequence" && sequenceStep >= 1 && sequenceStep < 4
              ? 1
              : phase === "sequence" && sequenceStep === 4
                ? 0.85
                : 1,
        }}
        transition={{ duration: 1 }}
      />

      {/* golden burst on snap */}
      <AnimatePresence>
        {sequenceStep === 4 && (
          <motion.div
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, times: [0, 0.15, 1] }}
            style={{
              background:
                "radial-gradient(closest-side at 50% 45%, rgba(246,231,209,0.9), rgba(217,163,95,0.5) 30%, transparent 65%)",
            }}
            aria-hidden
          />
        )}
      </AnimatePresence>

      <header className="relative z-10 flex shrink-0 items-center justify-between px-6 py-5 sm:px-10">
        <span className="eyebrow text-parchment/70">✦ One Wish Willow</span>
        <button
          onClick={onClose}
          className="eyebrow opacity-50 transition hover:opacity-100"
          aria-label="Leave the willow"
        >
          ✕ leave
        </button>
      </header>

      <motion.div
        className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 pb-16 pt-4 sm:max-w-xl"
        animate={shake ? { x: [0, -12, 14, -8, 6, 0], y: [0, 6, -6, 3, 0] } : { x: 0, y: 0 }}
        transition={{ duration: 0.42 }}
      >
        <div
          className={`w-full transition-all duration-700 ${
            compactBox ? "mb-10 max-w-[280px] sm:max-w-[320px]" : "mb-12 max-w-md"
          }`}
        >
          <FloatingBox
            state={boxState}
            warmth={phase === "write" ? warmth : 0}
            interactive={phase !== "sequence"}
            className="mx-auto w-full"
          />
        </div>

        <div className="w-full border-t border-glow/10 pt-10">
        <AnimatePresence mode="wait">
          {/* ── GATE: connect a wallet ── */}
          {phase === "gate" && (
            <motion.div
              key="gate"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              <p className="eyebrow">the willow only listens to the bonded</p>
              <h2 className="prophecy text-3xl text-parchment sm:text-4xl">
                Bind a wallet to be remembered.
              </h2>
              <p className="max-w-sm text-sm text-muted">
                Phantom · Solflare · Backpack. One soul, one wish — forever.
              </p>
              <WalletButton />
            </motion.div>
          )}

          {/* ── WRITE ── */}
          {phase === "write" && (
            <motion.div
              key="write"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex w-full flex-col items-center gap-8 text-center"
            >
              <div className="space-y-3">
                <p className="eyebrow">your one wish</p>
                <h2 className="prophecy text-3xl text-parchment text-glow-warm sm:text-4xl">
                  What do you wish for?
                </h2>
              </div>
              <div className="w-full space-y-2">
                <textarea
                  autoFocus
                  value={text}
                  maxLength={280}
                  onChange={(e) => handleType(e.target.value)}
                  rows={3}
                  placeholder="speak it softly…"
                  className="w-full resize-none rounded-sm border border-glow/15 bg-white/[0.02] px-4 py-4 text-center font-display text-xl leading-relaxed text-parchment outline-none transition placeholder:text-muted/35 focus:border-glow/45 focus:bg-white/[0.04] sm:text-2xl"
                />
                <p className="text-right text-xs text-muted/50">{text.length}/280</p>
              </div>
              {error && <p className="text-sm text-error/90">{error}</p>}
              <div className="flex w-full flex-col items-center gap-4">
                <button
                  className="btn-ritual w-full max-w-xs"
                  disabled={text.trim().length < 2}
                  onClick={runSequence}
                >
                  Grant my wish
                </button>
                <p className="eyebrow opacity-40">
                  bound · {truncateAddress(address ?? "")}
                </p>
              </div>
            </motion.div>
          )}

          {/* ── SEQUENCE ── */}
          {phase === "sequence" && (
            <motion.div
              key="sequence"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <AnimatePresence mode="wait">
                <motion.p
                  key={sequenceStep}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: sequenceStep === 3 ? 0.3 : 0.8 }}
                  exit={{ opacity: 0 }}
                  className="font-display text-xl italic text-parchment/80"
                >
                  {sequenceStep <= 1 && "the dark draws close…"}
                  {sequenceStep === 2 && "the willow bends…"}
                  {sequenceStep === 3 && "…"}
                  {sequenceStep === 4 && "SNAP"}
                  {sequenceStep >= 5 && "it is done."}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── REVEALED ── */}
          {phase === "revealed" && (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2 }}
              className="flex w-full flex-col items-center gap-7 text-center"
            >
              <p className="eyebrow">the keeper has spoken</p>
              <p className="prophecy max-w-xl text-2xl text-success text-glow-warm sm:text-3xl">
                {oracle}
              </p>
              {wishNumber && (
                <p className="eyebrow opacity-60">wish № {wishNumber.toLocaleString()}</p>
              )}
              <div className="mt-2 flex w-full flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-4">
                <ShareCard wish={displayedWish} oracle={oracle} wishNumber={wishNumber} />
                <button onClick={onClose} className="btn-ritual w-full sm:w-auto">
                  Return to the dark
                </button>
              </div>
            </motion.div>
          )}

          {/* ── REMEMBERS: already wished ── */}
          {phase === "remembers" && (
            <motion.div
              key="remembers"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex w-full flex-col items-center gap-6 text-center"
            >
              <p className="prophecy text-3xl text-parchment sm:text-4xl">The Willow remembers.</p>
              <p className="text-muted">You have already spent your wish.</p>
              {displayedWish && (
                <p className="font-display max-w-lg text-xl italic text-parchment/70">
                  “{displayedWish}”
                </p>
              )}
              {oracle && (
                <p className="prophecy max-w-xl text-xl text-success/90">{oracle}</p>
              )}
              {wishNumber && (
                <p className="eyebrow opacity-50">wish № {wishNumber.toLocaleString()}</p>
              )}
              <div className="mt-2 flex w-full flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-4">
                {displayedWish && (
                  <ShareCard wish={displayedWish} oracle={oracle} wishNumber={wishNumber} />
                )}
                <button onClick={onClose} className="btn-ritual w-full sm:w-auto">
                  Return to the dark
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </motion.div>

      {disconnecting && null}
    </motion.div>
  );
}
