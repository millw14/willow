"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  z: number; // depth 0..1 (1 = near)
  r: number;
  vx: number;
  vy: number;
  baseAlpha: number;
  twinkle: number;
}

interface ParticleFieldProps {
  /** 0 = calm, 1 = intense (more/brighter particles, faster drift). */
  intensity?: number;
  /** A few of the dust motes glow like tiny wishes. */
  className?: string;
}

/**
 * A performant 2D dust + floating-ember field. Reacts to the cursor with a
 * gentle parallax pull. Capped particle count and devicePixelRatio for 60fps
 * on mobile.
 */
export function ParticleField({ intensity = 0, className }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const COUNT = isMobile ? 60 : 130;
    const particles: Particle[] = [];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seed() {
      particles.length = 0;
      for (let i = 0; i < COUNT; i++) {
        const z = Math.random();
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          z,
          r: 0.4 + z * 2.4,
          vx: (Math.random() - 0.5) * 0.12,
          vy: -0.05 - Math.random() * 0.18,
          baseAlpha: 0.08 + z * 0.5,
          twinkle: Math.random() * Math.PI * 2,
        });
      }
    }

    resize();
    seed();

    function onMove(e: MouseEvent) {
      mouse.tx = e.clientX / width;
      mouse.ty = e.clientY / height;
    }
    function onTouch(e: TouchEvent) {
      if (!e.touches[0]) return;
      mouse.tx = e.touches[0].clientX / width;
      mouse.ty = e.touches[0].clientY / height;
    }

    let raf = 0;
    let t = 0;

    function frame() {
      t += 1;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      const I = intensityRef.current;

      ctx!.clearRect(0, 0, width, height);

      const px = (mouse.x - 0.5) * 2;
      const py = (mouse.y - 0.5) * 2;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const speed = 1 + I * 1.6;
        p.x += p.vx * speed - px * p.z * 0.6;
        p.y += p.vy * speed - py * p.z * 0.6;

        // wrap
        if (p.y < -8) {
          p.y = height + 8;
          p.x = Math.random() * width;
        }
        if (p.x < -8) p.x = width + 8;
        if (p.x > width + 8) p.x = -8;

        const tw = 0.6 + 0.4 * Math.sin(t * 0.02 + p.twinkle);
        const alpha = Math.min(1, p.baseAlpha * tw * (0.7 + I * 0.8));

        // Warm gold for near particles, dim ember for far
        const near = p.z > 0.72;
        ctx!.beginPath();
        if (near) {
          const grad = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
          grad.addColorStop(0, `rgba(230, 197, 138, ${alpha})`);
          grad.addColorStop(1, "rgba(217, 163, 95, 0)");
          ctx!.fillStyle = grad;
          ctx!.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
        } else {
          ctx!.fillStyle = `rgba(217, 163, 95, ${alpha * 0.6})`;
          ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        }
        ctx!.fill();
      }

      raf = requestAnimationFrame(frame);
    }

    if (!reduce) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("touchmove", onTouch, { passive: true });
      raf = requestAnimationFrame(frame);
    } else {
      // Draw one static frame for reduced motion.
      frame();
      cancelAnimationFrame(raf);
    }

    const onResize = () => {
      resize();
      seed();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1 }}
    />
  );
}
