import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#080706",
          borderRadius: 6,
          border: "1px solid rgba(217,163,95,0.5)",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "#D9A35F",
            fontFamily: "Georgia, serif",
            lineHeight: 1,
          }}
        >
          W
        </div>
      </div>
    ),
    { ...size },
  );
}
