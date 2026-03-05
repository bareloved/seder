import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Seder - ניהול הכנסות";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo representation */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            marginBottom: "24px",
          }}
        >
          {/* Top chevrons */}
          <svg
            width="120"
            height="60"
            viewBox="0 0 120 60"
            fill="none"
            style={{ marginBottom: "-10px" }}
          >
            <path
              d="M10 50 L60 10 L110 50"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M25 50 L60 22 L95 50"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M40 50 L60 34 L80 50"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: "white",
            letterSpacing: "0.1em",
            marginBottom: "16px",
          }}
        >
          SEDER
        </div>

        {/* Bottom chevrons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            marginBottom: "32px",
          }}
        >
          <svg
            width="120"
            height="60"
            viewBox="0 0 120 60"
            fill="none"
            style={{ marginTop: "-10px" }}
          >
            <path
              d="M10 10 L60 50 L110 10"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M25 10 L60 38 L95 10"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M40 10 L60 26 L80 10"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: "rgba(255, 255, 255, 0.8)",
            textAlign: "center",
            direction: "rtl",
          }}
        >
          ניהול הכנסות לפרילנסרים ומוזיקאים
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
