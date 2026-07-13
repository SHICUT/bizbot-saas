import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "FlowNex by Circle Creation — AI Customer Automation Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #3B82F6 0%, #7C3AED 100%)",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.95)",
            borderRadius: "24px",
            padding: "60px 80px",
            boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
          }}
        >
          <h1
            style={{
              fontSize: "64px",
              fontWeight: 800,
              background: "linear-gradient(135deg, #3B82F6 0%, #7C3AED 100%)",
              backgroundClip: "text",
              color: "transparent",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            FlowNex
          </h1>
          <p
            style={{
              fontSize: "24px",
              color: "#4B5563",
              marginTop: "12px",
              fontWeight: 500,
            }}
          >
            AI Customer Automation Platform
          </p>
          <p
            style={{
              fontSize: "16px",
              color: "#9CA3AF",
              marginTop: "20px",
            }}
          >
            by Circle Creation • Founded by Shivam Kumar
          </p>
        </div>
      </div>
    ),
    { ...size }
  );
}
