import { ImageResponse } from "next/og";

export const alt = "Завершення підтримки KodloHUB та інших проєктів";
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
          background: "#000000",
          color: "#ffffff",
          fontFamily: "Arial, sans-serif",
          padding: "66px 72px 58px",
          border: "1px solid #3a3a3f",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", color: "#a3a3a3", fontSize: 24, letterSpacing: 5 }}>
          <span>KODLOHUB</span>
          <span>01.08.2026</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1000 }}>
          <div style={{ color: "#a3a3a3", fontSize: 26, letterSpacing: 7, marginBottom: 22 }}>
            ОФІЦІЙНЕ ОГОЛОШЕННЯ
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 82, fontWeight: 800, letterSpacing: 1, lineHeight: 0.98 }}>
            <span>ЗАВЕРШЕННЯ</span>
            <span>ПІДТРИМКИ</span>
          </div>
          <div style={{ marginTop: 26, color: "#d4d4d4", fontSize: 32, lineHeight: 1.25 }}>
            KodloHUB та інші проєкти
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18, color: "#d4d4d4", fontSize: 25 }}>
          <div style={{ width: 156, height: 5, background: "#ffffff" }} />
          Звернення про подальший стан проєктів
        </div>
      </div>
    ),
    size
  );
}
