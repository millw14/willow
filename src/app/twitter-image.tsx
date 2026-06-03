import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "One Wish Willow — Everyone Gets One Wish";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function TwitterImage() {
  const box = await readFile(join(process.cwd(), "public/willow-box.png"));
  const boxSrc = `data:image/png;base64,${box.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#080706",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -120,
            left: "50%",
            transform: "translateX(-50%)",
            width: 900,
            height: 500,
            background: "radial-gradient(circle, rgba(217,163,95,0.35) 0%, transparent 70%)",
          }}
        />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={boxSrc}
          alt=""
          width={620}
          height={200}
          style={{
            objectFit: "contain",
            marginBottom: 36,
            filter: "drop-shadow(0 24px 60px rgba(0,0,0,0.8))",
          }}
        />

        <div
          style={{
            fontSize: 52,
            fontFamily: "Georgia, serif",
            color: "#F6E7D1",
            letterSpacing: "0.04em",
            textAlign: "center",
            textShadow: "0 0 40px rgba(217,163,95,0.35)",
          }}
        >
          One Wish Willow
        </div>

        <div
          style={{
            marginTop: 16,
            fontSize: 26,
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            color: "#E6C58A",
            textAlign: "center",
          }}
        >
          Everyone gets one wish.
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 36,
            fontSize: 13,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            color: "#9B8A78",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Use it carefully
        </div>
      </div>
    ),
    { ...size },
  );
}
