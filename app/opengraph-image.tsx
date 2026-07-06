import { ImageResponse } from "next/og";

export const alt = "KodloHUB";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#000",
          color: "#fff",
          fontFamily: "Arial, sans-serif",
          padding: "72px",
          border: "1px solid #2a2a2a",
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 10, textTransform: "uppercase", color: "#a3a3a3" }}>
          kodlo.host
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 102, fontWeight: 800, letterSpacing: 3, lineHeight: 0.95 }}>
            KodloHUB
          </div>
          <div style={{ marginTop: 28, maxWidth: 760, fontSize: 34, lineHeight: 1.28, color: "#d4d4d4" }}>
            Галерея, блог, артефакти, Кодлопедія, тулзи і проєкти кодла.
          </div>
        </div>
        <div style={{ height: 6, width: 280, background: "#fff" }} />
      </div>
    ),
    size
  );
}
