"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DecryptSequence, LoadingLetters } from "@/components/landing/ScrambleText";
import * as sound from "@/lib/sound";

const VIDEO_SRC = "/willow-intro.mp4";
const CRACK_RATIO = 0.78;
const LOADING_TEXT = "ONE WISH WILLOW";
const MIN_LOAD_MS = 2800;

const IDLE_LINES = [
  "Everyone gets one wish.",
  "Use it carefully.",
];

type Phase = "loading" | "idle" | "playing" | "exit";

interface LandingExperienceProps {
  onEnter: () => void;
  onComplete?: () => void;
}

export function LandingExperience({ onEnter, onComplete }: LandingExperienceProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const crackAtRef = useRef(4.2);
  const snappedRef = useRef(false);
  const phaseRef = useRef<Phase>("loading");
  const onEnterRef = useRef(onEnter);
  const onCompleteRef = useRef(onComplete);
  onEnterRef.current = onEnter;
  onCompleteRef.current = onComplete;

  const loadStartRef = useRef(Date.now());
  const videoBufferedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("loading");
  phaseRef.current = phase;
  const [loadProgress, setLoadProgress] = useState(0);
  const [showEnter, setShowEnter] = useState(false);
  const [burst, setBurst] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);

  const tryFinishLoading = useCallback(() => {
    if (phaseRef.current !== "loading") return;
    const elapsed = Date.now() - loadStartRef.current;
    if (!videoBufferedRef.current || elapsed < MIN_LOAD_MS) return;
    setPhase("idle");
    phaseRef.current = "idle";
  }, []);

  const beginExit = useCallback(() => {
    if (phaseRef.current === "exit") return;
    setPhase("exit");
    phaseRef.current = "exit";
    onEnterRef.current();
    window.setTimeout(() => onCompleteRef.current?.(), 1500);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onProgress = () => {
      if (!video.buffered.length || !video.duration) return;
      const end = video.buffered.end(video.buffered.length - 1);
      setLoadProgress(Math.min(1, end / video.duration));
    };

    const onMeta = () => {
      if (video.duration && isFinite(video.duration)) {
        crackAtRef.current = video.duration * CRACK_RATIO;
      }
      onProgress();
    };

    const onCanPlay = () => {
      videoBufferedRef.current = true;
      setVideoReady(true);
      setLoadProgress(1);
      tryFinishLoading();
    };

    const onTimeUpdate = () => {
      if (phaseRef.current !== "playing" || snappedRef.current) return;
      if (video.currentTime >= crackAtRef.current - 0.05) {
        snappedRef.current = true;
        setBurst(true);
        sound.snap();
        beginExit();
      }
    };

    const onEnded = () => {
      if (!snappedRef.current) beginExit();
    };

    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("progress", onProgress);
    video.addEventListener("canplaythrough", onCanPlay, { once: true });
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    video.load();

    const minTimer = window.setInterval(() => {
      tryFinishLoading();
    }, 200);

    const fallback = window.setTimeout(() => {
      videoBufferedRef.current = true;
      setVideoReady(true);
      setLoadProgress(1);
      tryFinishLoading();
    }, 14000);

    return () => {
      window.clearInterval(minTimer);
      window.clearTimeout(fallback);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("progress", onProgress);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
    };
  }, [beginExit, tryFinishLoading]);

  const handleEnter = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !videoReady) return;

    sound.resumeAudio();
    sound.startAmbient();
    sound.chime(523);

    snappedRef.current = false;
    setBurst(false);
    setPhase("playing");
    phaseRef.current = "playing";

    video.currentTime = 0;
    video.muted = false;
    setVideoVisible(true);

    try {
      await video.play();
    } catch {
      video.muted = true;
      await video.play();
    }

    sound.rumble(2.8);
  }, [videoReady]);

  const isExiting = phase === "exit";

  return (
    <motion.div
      className="fixed inset-0 z-[90] overflow-hidden bg-ink"
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: videoVisible && !isExiting ? 1 : 0 }}
        transition={{ duration: isExiting ? 1.2 : 1.1, ease: "easeInOut" }}
      >
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          className="h-full w-full object-cover"
          playsInline
          preload="auto"
          muted
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 120% at 50% 50%, transparent 45%, rgba(8,7,6,0.45) 100%)",
          }}
          aria-hidden
        />
      </motion.div>

      <AnimatePresence>
        {(phase === "loading" || phase === "idle") && (
          <motion.div
            key="black-stage"
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-ink px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
          >
            <div className="flex min-h-[120px] flex-col items-center justify-center text-center">
              {phase === "loading" && (
                <LoadingLetters
                  text={LOADING_TEXT}
                  className="font-display text-2xl tracking-[0.12em] text-parchment/90 sm:text-4xl"
                />
              )}

              {phase === "idle" && !showEnter && (
                <DecryptSequence
                  lines={IDLE_LINES}
                  className="prophecy text-3xl text-parchment text-glow-warm sm:text-4xl"
                  onComplete={() => setShowEnter(true)}
                />
              )}

              {phase === "idle" && showEnter && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.4 }}
                  className="btn-ritual"
                  onClick={handleEnter}
                >
                  Enter
                </motion.button>
              )}
            </div>

            {phase === "loading" && (
              <div className="absolute inset-x-0 bottom-16 flex flex-col items-center gap-4 px-6">
                <div className="h-px w-full max-w-[200px] overflow-hidden bg-glow/10">
                  <motion.div
                    className="h-full bg-glow/60"
                    animate={{ width: `${Math.max(4, Math.round(loadProgress * 100))}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
                <p className="eyebrow opacity-35">{loadProgress < 1 ? "loading" : "ready"}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {burst && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0.5, 0] }}
            transition={{ duration: 1.6, ease: "easeInOut", times: [0, 0.15, 0.45, 1] }}
            style={{
              background:
                "radial-gradient(closest-side at 50% 48%, rgba(246,231,209,0.9), rgba(217,163,95,0.4) 35%, transparent 70%)",
            }}
            aria-hidden
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
