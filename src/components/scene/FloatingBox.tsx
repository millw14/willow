"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export type BoxState = "float" | "tense" | "snapping" | "broken";

interface FloatingBoxProps {
  state?: BoxState;
  /** 0..1 — how warm the glow burns (rises as the seeker types). */
  warmth?: number;
  className?: string;
  interactive?: boolean;
}

export function FloatingBox({
  state = "float",
  warmth = 0,
  className,
  interactive = true,
}: FloatingBoxProps) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 60, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 60, damping: 18 });

  useEffect(() => {
    if (!interactive) return;
    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [interactive, mx, my]);

  const broken = state === "broken";
  const glowScale = 1 + warmth * 0.5;
  const glowOpacity = 0.35 + warmth * 0.5;

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ perspective: 1200 }}
    >
      {/* Volumetric glow */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[60px]"
        style={{
          width: "70%",
          height: "55%",
          background:
            "radial-gradient(closest-side, rgba(217,163,95,0.9), rgba(138,58,21,0.25) 55%, transparent 75%)",
        }}
        animate={{
          opacity: broken ? 0.18 : glowOpacity,
          scale: state === "snapping" ? [1, 2.4, 1.1] : glowScale,
        }}
        transition={{ duration: state === "snapping" ? 0.9 : 1.4, ease: "easeOut" }}
      />

      <motion.div
        className="relative w-full max-w-[680px]"
        style={{ rotateX: interactive ? rx : 0, rotateY: interactive ? ry : 0, transformStyle: "preserve-3d" }}
        animate={
          state === "snapping"
            ? { x: [0, -8, 10, -6, 4, 0], rotate: [0, -1.5, 2, -1, 0] }
            : broken
              ? { y: 0 }
              : { y: [0, -16, 0] }
        }
        transition={
          state === "snapping"
            ? { duration: 0.6 }
            : broken
              ? { duration: 0.4 }
              : { duration: 9, repeat: Infinity, ease: "easeInOut" }
        }
      >
        {broken ? <BrokenBox /> : <IntactBox bend={state === "tense" ? 1 : 0} />}
      </motion.div>
    </div>
  );
}

function IntactBox({ bend }: { bend: number }) {
  return (
    <motion.img
      src="/willow-box.png"
      alt="The One Wish Willow"
      draggable={false}
      className="w-full select-none drop-shadow-[0_40px_80px_rgba(0,0,0,0.7)]"
      animate={{
        filter: bend
          ? "brightness(1.15) contrast(1.05) saturate(1.1)"
          : "brightness(1) contrast(1) saturate(1)",
        scaleY: bend ? 0.985 : 1,
        rotate: bend ? [0, -0.8, 0.8, -0.4, 0] : 0,
      }}
      transition={{ duration: bend ? 2.6 : 0.6, ease: "easeInOut" }}
    />
  );
}

/** Two clipped halves of the box, rotated apart with a charred gap between. */
function BrokenBox() {
  return (
    <div className="relative w-full">
      <motion.img
        src="/willow-box.png"
        alt="The broken Willow"
        draggable={false}
        className="w-full select-none"
        initial={{ rotate: 0, x: 0 }}
        animate={{ rotate: -7, x: -18, y: 6 }}
        transition={{ type: "spring", stiffness: 80, damping: 12 }}
        style={{
          clipPath: "polygon(0 0, 52% 0, 46% 100%, 0 100%)",
          filter: "brightness(0.65) saturate(0.7)",
          transformOrigin: "left center",
        }}
      />
      <motion.img
        src="/willow-box.png"
        alt=""
        aria-hidden
        draggable={false}
        className="absolute inset-0 w-full select-none"
        initial={{ rotate: 0, x: 0 }}
        animate={{ rotate: 7, x: 18, y: 6 }}
        transition={{ type: "spring", stiffness: 80, damping: 12 }}
        style={{
          clipPath: "polygon(52% 0, 100% 0, 100% 100%, 46% 100%)",
          filter: "brightness(0.65) saturate(0.7)",
          transformOrigin: "right center",
        }}
      />
      {/* charred seam */}
      <div
        aria-hidden
        className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2"
        style={{
          background: "linear-gradient(180deg, transparent, rgba(106,39,39,0.9), transparent)",
          filter: "blur(2px)",
        }}
      />
    </div>
  );
}
