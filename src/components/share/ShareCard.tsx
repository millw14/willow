"use client";

import { useState } from "react";

interface ShareCardProps {
  wish: string;
  oracle: string | null;
  wishNumber: number | null;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function ShareCard({ wish, oracle, wishNumber }: ShareCardProps) {
  const [busy, setBusy] = useState(false);

  async function generate(): Promise<Blob | null> {
    const W = 1200;
    const H = 675;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d") as
      | (CanvasRenderingContext2D & { letterSpacing: string })
      | null;
    if (!ctx) return null;

    // background
    ctx.fillStyle = "#080706";
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, H * 0.32, 40, W / 2, H * 0.32, 620);
    glow.addColorStop(0, "rgba(217,163,95,0.28)");
    glow.addColorStop(1, "rgba(8,7,6,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // eyebrow
    ctx.fillStyle = "#9B8A78";
    ctx.font = "600 20px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.letterSpacing = "8px";
    ctx.fillText("O N E   W I S H   W I L L O W", W / 2, 96);
    ctx.letterSpacing = "0px";

    // wish
    ctx.fillStyle = "#F6E7D1";
    ctx.font = "300 56px Georgia, 'Cormorant Garamond', serif";
    const wishLines = wrapText(ctx, `“${wish}”`, W - 240).slice(0, 4);
    let y = 230;
    for (const line of wishLines) {
      ctx.fillText(line, W / 2, y);
      y += 70;
    }

    // oracle
    if (oracle) {
      ctx.fillStyle = "#E6C58A";
      ctx.font = "italic 30px Georgia, serif";
      const oracleLines = wrapText(ctx, oracle, W - 320).slice(0, 3);
      y += 24;
      for (const line of oracleLines) {
        ctx.fillText(line, W / 2, y);
        y += 42;
      }
    }

    // footer
    ctx.fillStyle = "#9B8A78";
    ctx.font = "600 18px 'Space Grotesk', sans-serif";
    ctx.letterSpacing = "4px";
    ctx.fillText(
      wishNumber ? `WISH № ${wishNumber.toLocaleString()}  ·  EVERYONE GETS ONE` : "EVERYONE GETS ONE WISH",
      W / 2,
      H - 56,
    );
    ctx.letterSpacing = "0px";

    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  }

  async function handleShare() {
    setBusy(true);
    try {
      const blob = await generate();
      if (!blob) return;
      const file = new File([blob], "one-wish-willow.png", { type: "image/png" });
      const shareText = oracle
        ? `“${wish}” — the One Wish Willow heard me.`
        : `“${wish}” — One Wish Willow.`;

      // Native share with image where available (mobile)
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText, title: "One Wish Willow" });
        return;
      }

      // Otherwise download the card and open the X composer
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "one-wish-willow.png";
      a.click();
      URL.revokeObjectURL(url);
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText} onewishwillow.com`)}`,
        "_blank",
        "noopener",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn-ritual w-full sm:w-auto" onClick={handleShare} disabled={busy}>
      {busy ? "etching…" : "Share your wish"}
    </button>
  );
}
