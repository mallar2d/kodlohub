"use client";

import { createContext, useCallback, useContext, useMemo, useRef } from "react";
import { CartesianGrid, Label, ResponsiveContainer, Scatter, ScatterChart, XAxis, YAxis, ZAxis } from "recharts";
import type { PublishedResult } from "@/lib/kodlobench/types";
import {
  entryLabel,
  formatCost,
  formatDuration,
  formatMetric,
  formatScore,
  formatTokens,
  metricValue,
  METRIC_LABEL,
} from "@/lib/kodlobench/format";
import { slotOf } from "@/lib/kodlobench/view";
import { slotColor } from "./palette";

type XKey = "cost" | "time" | "tokens";

interface Props {
  rows: PublishedResult[];
  xKey: XKey;
  log: boolean;
  slots: (string | null)[];
  hoverId: string | null;
  onHover: (id: string | null) => void;
  onToggle: (id: string) => void;
  currency: string | null;
}

/** Stable datum: never carries hover or selection state, so Recharts keeps every mark mounted. */
interface Point {
  id: string;
  x: number;
  y: number;
  layer: "base" | "top";
}

interface PointProps {
  cx?: number;
  cy?: number;
  payload?: Point;
}

/** Everything that changes on hover/selection travels through context instead of the data. */
interface PlotState {
  onHover: (id: string | null) => void;
  onToggle: (id: string) => void;
  move: (from: string, delta: number) => void;
  slots: (string | null)[];
  hoverId: string | null;
  anchorId: string | null;
  byId: Map<string, PublishedResult>;
  xKey: XKey;
  currency: string | null;
}

const PlotCtx = createContext<PlotState | null>(null);

/**
 * Module-level component with a stable identity, so hovering or focusing a point
 * never remounts it (a remount would drop keyboard focus and the hover state).
 * All per-point state travels in the datum.
 */
function PointShape({ cx, cy, payload }: PointProps) {
  const st = useContext(PlotCtx);
  if (!st || cx === undefined || cy === undefined || !payload) return <g />;
  const r = st.byId.get(payload.id);
  if (!r) return <g />;
  const { id, layer } = payload;
  const slot = slotOf(st.slots, id);
  const hot = st.hoverId === id;
  const hasSelection = st.slots.some(Boolean);
  const dim = hasSelection && slot === -1 && !hot;
  const anchor = st.anchorId === id;
  const aria = `${entryLabel(r)}: бал ${formatScore(r.score, r.category)}, ${METRIC_LABEL[st.xKey].toLowerCase()} ${formatMetric(r, st.xKey, st.currency)}. ${
    slot !== -1 ? "Прибрати з порівняння" : "Додати до порівняння"
  }`;
  const actions = st;
  const selected = slot !== -1;
  const fill = selected ? slotColor(slot) : hot ? "var(--on-primary)" : "var(--on-primary-mute)";
  const marks = (
    <>
      {hot && <circle cx={cx} cy={cy} r={11} fill="none" stroke="var(--on-primary)" strokeWidth={1.5} />}
      <circle cx={cx} cy={cy} r={selected ? 7 : 5} fill={fill} stroke="var(--canvas-night)" strokeWidth={2} opacity={dim ? 0.4 : 1} />
      {selected && (
        <text
          x={cx + 12}
          y={cy + 4}
          fontSize={11}
          fontWeight={700}
          fill="var(--on-primary)"
          stroke="var(--canvas-night)"
          strokeWidth={3}
          paintOrder="stroke"
        >
          {slot + 1}
        </text>
      )}
    </>
  );

  if (layer === "top") {
    if (!selected && !hot) return <g />;
    return (
      <g aria-hidden="true" pointerEvents="none">
        {marks}
      </g>
    );
  }

  return (
    <g
      data-kb-point={id}
      role="button"
      tabIndex={anchor ? 0 : -1}
      aria-pressed={selected}
      aria-label={aria}
      style={{ cursor: "pointer", outline: "none" }}
      onMouseEnter={() => actions.onHover(id)}
      onMouseLeave={() => actions.onHover(null)}
      onFocus={() => actions.onHover(id)}
      onBlur={() => actions.onHover(null)}
      onClick={() => actions.onToggle(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          actions.onToggle(id);
        } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          actions.move(id, 1);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          actions.move(id, -1);
        }
      }}
    >
      <circle cx={cx} cy={cy} r={14} fill="transparent" />
      {marks}
    </g>
  );
}

const TICK = { fill: "var(--ink-mute)", fontSize: 11 };
// Module-level constants: Recharts re-registers its series (and remounts every mark) when a prop's identity changes.
const MARGIN = { top: 12, right: 24, bottom: 28, left: 4 };
const DOMAIN_LOG: ["auto", "auto"] = ["auto", "auto"];
const DOMAIN_LINEAR: [number, "auto"] = [0, "auto"];
const DOMAIN_Y: ["auto", "auto"] = ["auto", "auto"];
const Z_RANGE: [number, number] = [60, 60];

export default function ScatterPlot({ rows, xKey, log, slots, hoverId, onHover, onToggle, currency }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  // `rows` gets a new identity on every selection change although the plotted points are the same.
  // Key the derived data by content so the chart is not rebuilt (and focus lost) on each toggle.
  const idsKey = rows.map((r) => r.id).join("\n");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [idsKey]);

  // Reading order (by x, then y) for arrow-key navigation and the stable draw order.
  const ordered = useMemo(
    () =>
      rows
        .map((r) => ({ id: r.id, x: metricValue(r, xKey) as number, y: r.score as number }))
        .sort((a, b) => a.x - b.x || a.y - b.y),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idsKey, xKey],
  );
  const base = useMemo<Point[]>(() => ordered.map((p) => ({ ...p, layer: "base" as const })), [ordered]);
  // Same points drawn again on top: selected/hovered marks can't be hidden by neighbours.
  const top = useMemo<Point[]>(() => ordered.map((p) => ({ ...p, layer: "top" as const })), [ordered]);

  const anchorId = hoverId && byId.has(hoverId) ? hoverId : (ordered[0]?.id ?? null);

  const state = useMemo<PlotState>(
    () => ({
      onHover,
      onToggle,
      move: (from, delta) => {
        const i = ordered.findIndex((p) => p.id === from);
        const next = ordered[(i + delta + ordered.length) % ordered.length];
        wrapRef.current?.querySelector<SVGGElement>(`[data-kb-point="${CSS.escape(next.id)}"]`)?.focus();
      },
      slots,
      hoverId,
      anchorId,
      byId,
      xKey,
      currency,
    }),
    [onHover, onToggle, ordered, slots, hoverId, anchorId, byId, xKey, currency],
  );

  const category = rows[0]?.category;
  const fmtScoreTick = useCallback((v: number) => formatScore(v, category), [category]);
  const fmtX = useCallback(
    (v: number) => (xKey === "cost" ? formatCost(v, currency) : xKey === "time" ? formatDuration(v) : formatTokens(v)),
    [xKey, currency],
  );

  // Memoised: Recharts remounts every mark whenever its tree re-renders. Hover and selection
  // reach the marks through context instead, so this subtree stays untouched while the visitor interacts.
  const chart = useMemo(
    () => (
      <ResponsiveContainer width="100%" height={360}>
        <ScatterChart margin={MARGIN} accessibilityLayer={false}>
          <CartesianGrid stroke="var(--hairline-dark)" strokeDasharray="3 4" />
          <XAxis
            type="number"
            dataKey="x"
            name={METRIC_LABEL[xKey]}
            scale={log ? "log" : "linear"}
            domain={log ? DOMAIN_LOG : DOMAIN_LINEAR}
            tick={TICK}
            tickFormatter={fmtX}
            stroke="var(--hairline-dark)"
            allowDataOverflow={false}
          >
            <Label value={`${METRIC_LABEL[xKey]}${log ? " (логарифмічна шкала)" : ""}`} position="bottom" offset={8} fill="var(--ink-mute)" fontSize={11} />
          </XAxis>
          <YAxis
            type="number"
            dataKey="y"
            name="Бал"
            domain={DOMAIN_Y}
            tick={TICK}
            tickFormatter={fmtScoreTick}
            stroke="var(--hairline-dark)"
            width={44}
          />
          <ZAxis range={Z_RANGE} />
          <Scatter data={base} shape={PointShape as never} isAnimationActive={false} />
          <Scatter data={top} shape={PointShape as never} isAnimationActive={false} legendType="none" />
        </ScatterChart>
      </ResponsiveContainer>
    ),
    [base, top, xKey, log, fmtX, fmtScoreTick],
  );

  return (
    <PlotCtx.Provider value={state}>
      <div ref={wrapRef} role="group" aria-label={`Бал і ${METRIC_LABEL[xKey].toLowerCase()}. Стрілки переміщують між точками, Enter додає до порівняння`}>
        {chart}
      </div>
    </PlotCtx.Provider>
  );
}
