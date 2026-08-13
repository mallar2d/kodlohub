---
version: 2.0-xAI
name: KodloHUB-xAI-Design-System
description: Official xAI-inspired design specification for KodloHUB 2.0. Strict near-black canvas (#0a0a0a), pill outlines (9999px), crisp geometric typography, uppercase tracked monospace metadata, hairline borders (#212327), and pure monochrome SVG icon sets.
---

# KodloHUB 2.0 — xAI Design System Specification

## 1. Core Visual Philosophy
- **Engineered-Cosmic & Unmarketed**: Minimalist, research-lab aesthetic. Zero decorative fluff, zero emojis, zero heavy drop shadows.
- **Strict Near-Black Canvas**: High contrast between deep black background (`#0a0a0a`), stark white text (`#ffffff`), and subtle steel-gray metadata (`#7d8187`).
- **Pill & Border-Driven Geometry**: Interactive buttons and status indicators are pills (`9999px` border-radius) wrapped in 1px translucent borders (`rgba(255, 255, 255, 0.12)`).
- **Depth via Opacity**: Depth is created strictly through background contrast (`#121316` / `#16181c`) and border opacity shifts (`0.08` to `0.25`), never colorful neon glows or heavy box shadows.

---

## 2. Design Tokens

### Colors
```yaml
canvas: "#0a0a0a"             # Strict edge-to-edge background
canvas-soft: "#121316"        # Secondary surface / elevated elements
canvas-card: "#16181c"        # Card background
primary: "#ffffff"            # Primary text / high-emphasis elements
on-primary: "#0a0a0a"         # Text on primary solid white buttons
body: "#dadbdf"               # Standard body text
body-mid: "#7d8187"           # Secondary body & muted text
hairline: "#212327"           # Default 1px hairline border
hairline-hover: "rgba(255, 255, 255, 0.25)" # Border hover state
accent-sunset: "#ff7a17"      # High-status milestone tag
accent-dusk: "#7c3aed"        # Developer/special badge tag
```

### Typography
- **Display Headings**: Geometric sans-serif (Inter / Universal Sans style), tracking-tight on massive hero displays, bold and punchy.
- **Micro-Caps & Metadata**: Uppercase monospace (`font-mono`), `letter-spacing: 0.08em` to `0.12em`, `font-size: 10px - 12px`, `#7d8187`.
- **Body**: 14px - 16px, `line-height: 1.6`, `#dadbdf`.

### Components
1. **Buttons**:
   - `btn-solid`: `bg-[#ffffff] text-[#0a0a0a] rounded-full font-medium px-5 py-2.5 hover:bg-[#eaeaea] transition-all`
   - `btn-ghost`: `bg-transparent text-[#ffffff] border border-[#212327] rounded-full hover:border-white/40 hover:bg-white/[0.05] transition-all`
2. **Cards (`card-dark`)**:
   - `bg-[#121316]/80 backdrop-blur border border-[#212327] rounded-xl hover:border-white/25 transition-all`
3. **Badges (`badge-status`)**:
   - `rounded-full border border-[#212327] bg-white/[0.03] text-white/90 text-[11px] font-mono px-3 py-1`
4. **Icons**:
   - Strictly monochrome outline SVGs (`currentColor`, `strokeWidth: 1.75 - 2`).
