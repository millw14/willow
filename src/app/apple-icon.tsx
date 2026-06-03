import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          background: "radial-gradient(circle at 50% 35%, rgba(217,163,95,0.22), #080706 65%)",
          border: "2px solid rgba(217,163,95,0.35)",
        }}
      >
        <div
          style={{
            fontSize: 88,
            fontWeight: 600,
            color: "#D9A35F",
            fontFamily: "Georgia, serif",
            lineHeight: 1,
          }}
        >
          W
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            letterSpacing: "0.32em",
            color: "#9B8A78",
            fontFamily: "system-ui, sans-serif",
            textTransform: "uppercase",
          }}
        >
          Willow
        </div>
      </div>
    ),
    { ...size },
  );
}
