import { ImageResponse } from "next/og";

export const alt = "KodloHUB — Хаб кодла";
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
          backgroundColor: "#000000",
          backgroundImage: "radial-gradient(circle at 50% 0%, #151515 0%, #000000 75%)",
          color: "#ffffff",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: "54px 60px",
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {/* Subtle Outer Frame */}
        <div
          style={{
            position: "absolute",
            inset: "24px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "24px",
            pointerEvents: "none",
          }}
        />

        {/* Top Header Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            zIndex: 2,
          }}
        >
          {/* Eyebrow Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 18px",
              borderRadius: "9999px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
              }}
            />
            <span
              style={{
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "3px",
                textTransform: "uppercase",
                color: "#e4e4e7",
                fontFamily: "monospace",
              }}
            >
              KODLO.HOST
            </span>
          </div>

          {/* Right Status */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.07)",
              color: "#a1a1aa",
              fontSize: "12px",
              fontFamily: "monospace",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
            }}
          >
            AUTONOMOUS HUB
          </div>
        </div>

        {/* Middle Main Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "16px",
            marginBottom: "16px",
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontSize: "92px",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 0.95,
              textTransform: "uppercase",
              color: "#ffffff",
            }}
          >
            KodloHUB
          </div>

          <div
            style={{
              marginTop: "20px",
              maxWidth: "880px",
              fontSize: "26px",
              lineHeight: 1.35,
              color: "#a1a1aa",
              fontWeight: 400,
            }}
          >
            Все, що створило кодло, в одному місці. Проєкти, артефакти, Кодлопедія, ігри та Kava Hub.
          </div>
        </div>

        {/* Bottom Feature Badges Grid */}
        <div
          style={{
            display: "flex",
            gap: "14px",
            width: "100%",
            zIndex: 2,
          }}
        >
          {[
            { label: "ПРОЄКТИ", sub: "Центр розробки" },
            { label: "KAVA HUB", sub: "Економіка 22:00" },
            { label: "АРКАДА & LAB", sub: "Brat TD & Дуелі" },
            { label: "КОДЛОПЕДІЯ", sub: "База знань" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                padding: "14px 18px",
                borderRadius: "14px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  color: "#ffffff",
                  fontFamily: "monospace",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#71717a",
                  marginTop: "3px",
                }}
              >
                {item.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
