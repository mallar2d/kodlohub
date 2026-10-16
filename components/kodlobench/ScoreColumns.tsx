"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { scoreMaxFor } from "@/lib/kodlobench/categories";
import { FAILED, NO_DATA, formatScore, scoreText } from "@/lib/kodlobench/format";
import type { OverallPair } from "@/lib/kodlobench/overall";
import type { PublishedResult } from "@/lib/kodlobench/types";
import { slotOf, sortResults } from "@/lib/kodlobench/view";
import { familyLogoPath } from "@/lib/kodlobench/family-logos";
import { familyOf } from "@/lib/kodlobench/families";
import { familyColor } from "./palette";

interface Props {
  rows: PublishedResult[];
  slots: (string | null)[];
  hoverId: string | null;
  onHover: (id: string | null) => void;
  onToggle: (id: string) => void;
  categoryId: string;
  /**
   * Overall view only: the same row in both modes (with and without the optional category).
   * The part of the column the category adds or takes away is drawn in its own shade.
   */
  pairs?: Map<string, OverallPair>;
  /** Name of the optional category, for the accessible description. */
  pairName?: string;
}

const HEIGHT = 400;
const TOP = 30;
const LEFT = 44;
const RIGHT = 12;
const SLOT_MIN = 54;
const SLOT_MAX = 260;
const LOGO = 20;
const LABEL_CHAR = 6;

/** Axis step: 1, 2 or 5 times a power of ten, giving at most five intervals. */
function niceStep(max: number): number {
  const raw = max / 5;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}

const label = (r: PublishedResult) => (r.config ? `${r.model} (${r.config})` : r.model);

/**
 * Score columns in the style of an intelligence index: columns sorted by score, coloured by model
 * family, value inside the column, model names under it. Every column is a button, so selection
 * and highlight are shared with the scatter charts and the table, and the keyboard works.
 */
export default function ScoreColumns({ rows, slots, hoverId, onHover, onToggle, categoryId, pairs, pairName }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const sorted = useMemo(() => sortResults(rows, "score", "desc"), [rows]);
  const familyIds = useMemo(() => [...new Set(rows.map((r) => familyOf(r.model).id))], [rows]);
  const hasSelection = slots.some(Boolean);
  const n = sorted.length;

  const { min, max } = useMemo(() => {
    const vals = rows.map((r) => r.score).filter((v): v is number => v !== null);
    return { min: Math.min(0, ...vals), max: Math.max(scoreMaxFor(categoryId), ...vals) };
  }, [rows, categoryId]);

  const longest = Math.max(0, ...sorted.map((r) => label(r).length));
  const bottom = Math.min(230, Math.max(90, Math.ceil(longest * LABEL_CHAR * 0.72) + 18 + LOGO + 8));
  // The first column's tilted name reaches left of its column: widen the left padding so it is not cut off.
  const firstReach = sorted[0] ? label(sorted[0]).length * LABEL_CHAR * 0.72 : 0;
  const leftBase = LEFT + Math.min(190, Math.max(0, Math.ceil(firstReach - LEFT - SLOT_MIN / 2)));
  const plotH = HEIGHT - TOP - bottom;
  // Columns spread across the card but never wider than SLOT_MAX each, so a few models do not become hairlines.
  const innerW = Math.max(Math.min(width - leftBase - RIGHT, n * SLOT_MAX), n * SLOT_MIN, 0);
  // With few models the block is centred in the card instead of hugging the left edge.
  const left = leftBase + Math.max(0, Math.floor((width - leftBase - RIGHT - innerW) / 2));
  const svgW = left + innerW + RIGHT;
  const slotW = n > 0 ? innerW / n : 0;
  const barW = Math.min(60, slotW * 0.62);
  const y = (v: number) => TOP + plotH * (1 - (v - min) / (max - min || 1));
  const baseY = y(Math.max(0, min));

  const step = niceStep(max - min);
  const ticks: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + 1e-9; t += step) ticks.push(Math.round(t * 1e6) / 1e6);

  const anchorId = hoverId && sorted.some((r) => r.id === hoverId) ? hoverId : (sorted[0]?.id ?? null);

  function move(from: string, delta: number) {
    const i = sorted.findIndex((r) => r.id === from);
    const next = sorted[(i + delta + n) % n];
    wrapRef.current?.querySelector<SVGGElement>(`[data-kb-col="${CSS.escape(next.id)}"]`)?.focus();
  }

  return (
    <div ref={wrapRef} className="overflow-x-auto" role="group" aria-label="Стовпці балів. Стрілки переміщують між моделями, Enter додає до порівняння">
      <svg width={svgW} height={HEIGHT} role="presentation" style={{ display: "block" }}>
        <defs>
          {familyIds.map((f) => (
            <pattern key={f} id={`kb-neg-${f}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill={`var(--kb-fam-${f})`} opacity="0.14" />
              <line x1="0" y1="0" x2="0" y2="6" stroke={`var(--kb-fam-${f})`} strokeWidth="2.5" />
            </pattern>
          ))}
          <pattern id="kb-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
            <line x1="0" y1="0" x2="0" y2="7" stroke="var(--hairline-dark)" strokeWidth="2" />
          </pattern>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={left + innerW} y1={y(t)} y2={y(t)} stroke="var(--hairline-dark)" strokeDasharray="2 4" />
            <text x={left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--ink-mute)">
              {formatScore(t, categoryId)}
            </text>
          </g>
        ))}

        {sorted.map((r, i) => {
          const slot = slotOf(slots, r.id);
          const selected = slot !== -1;
          const hot = hoverId === r.id;
          const dim = hasSelection && !selected && !hot;
          const failed = r.status === "failed";
          const color = familyColor(r.model);
          const cx = left + slotW * i + slotW / 2;
          const x0 = cx - barW / 2;
          const hasScore = r.score !== null;
          // Overall view: both modes in one column. Solid up to the lower of the two totals; the part up
          // to the higher one is the category's effect: light = it adds points, hatched = it takes them away.
          const pair = pairs?.get(r.id);
          const hasPair = !!pair && pair.with !== null && pair.without !== null && pair.with !== pair.without;
          const effect = hasPair ? (pair!.with as number) - (pair!.without as number) : 0;
          const lo = hasPair ? Math.min(pair!.with as number, pair!.without as number) : (r.score as number);
          const hi = hasPair ? Math.max(pair!.with as number, pair!.without as number) : (r.score as number);
          const top = hasScore ? Math.min(y(hi), baseY - 2) : baseY - 26;
          const loTop = hasScore ? Math.min(y(lo), baseY - 2) : top;
          const barH = baseY - top;
          // With the effect segment the value always sits above the column, so it never lands on the shaded part.
          const inside = barH >= 26 && !pairs;
          const valueText = hasScore ? scoreText(r) : null;
          const effectText = hasPair ? `${effect > 0 ? "+" : "−"}${formatScore(Math.abs(effect), categoryId)}` : null;
          const stackTop = top - 7 - (effectText ? 16 : 0);
          const name = label(r);
          const logo = familyLogoPath(familyOf(r.model).id);
          return (
            <g
              key={r.id}
              data-kb-col={r.id}
              role="button"
              tabIndex={anchorId === r.id ? 0 : -1}
              aria-pressed={selected}
              aria-label={`${name}${r.agent ? `, ${r.agent}` : ""}: бал ${hasScore ? scoreText(r) : failed ? FAILED : NO_DATA}.${
                hasPair ? ` ${pairName ?? "Категорія"} ${effect > 0 ? "додає" : "забирає"} ${formatScore(Math.abs(effect), categoryId)}: з нею ${formatScore(pair!.with, categoryId)}, без неї ${formatScore(pair!.without, categoryId)}.` : ""
              }${r.alert ? ` Застереження: ${r.alert}.` : ""} ${
                selected ? "Прибрати з порівняння" : "Додати до порівняння"
              }`}
              style={{ cursor: "pointer", outline: "none" }}
              onMouseEnter={() => onHover(r.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(r.id)}
              onBlur={() => onHover(null)}
              onClick={() => onToggle(r.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle(r.id);
                } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  move(r.id, 1);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  move(r.id, -1);
                }
              }}
            >
              {/* full-height hit area, wider than the column itself */}
              <rect x={cx - slotW / 2} y={TOP} width={slotW} height={plotH + bottom - 10} fill="transparent" />
              {hot && <rect x={cx - slotW / 2 + 2} y={TOP - 4} width={slotW - 4} height={plotH + 4} rx={6} fill="var(--on-primary)" opacity={0.07} />}

              <rect
                x={x0}
                y={hasPair ? loTop : top}
                width={barW}
                height={Math.max(baseY - (hasPair ? loTop : top), 2)}
                rx={4}
                fill={hasScore ? color : "url(#kb-hatch)"}
                opacity={dim ? 0.3 : 1}
                stroke={selected || hot ? "var(--on-primary)" : hasScore ? "none" : "var(--hairline-dark)"}
                strokeWidth={selected ? 2 : 1.5}
              />

              {hasPair && (
                <rect
                  x={x0}
                  y={top}
                  width={barW}
                  height={Math.max(loTop - top, 2)}
                  rx={3}
                  fill={effect > 0 ? color : `url(#kb-neg-${familyOf(r.model).id})`}
                  fillOpacity={effect > 0 ? 0.4 : 1}
                  stroke={color}
                  strokeWidth={1.2}
                  strokeDasharray={effect > 0 ? undefined : "3 2"}
                  opacity={dim ? 0.3 : 1}
                />
              )}

              {hasPair && hasScore && (
                // Tick at the level of the mode being shown; the number above the column is this level.
                <line
                  x1={x0 - 4}
                  x2={x0 + barW + 4}
                  y1={Math.min(y(r.score as number), baseY - 2)}
                  y2={Math.min(y(r.score as number), baseY - 2)}
                  stroke="var(--on-primary)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={dim ? 0.4 : 1}
                />
              )}

              {effectText && (
                <text x={cx} y={top - 7 - 16 + 2} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--on-primary-mute)" opacity={dim ? 0.5 : 1}>
                  {effectText}
                </text>
              )}

              {valueText && (
                <text
                  x={cx}
                  y={inside ? top + 18 : top - 7}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight={700}
                  fill={inside ? "var(--canvas-night)" : "var(--on-primary)"}
                  opacity={dim ? 0.5 : 1}
                >
                  {valueText}
                </text>
              )}

              {r.alert && (
                <g
                  transform={`translate(${cx - 7},${(inside ? top : stackTop + 7 - 14) - 22}) scale(${14 / 24})`}
                  fill="none"
                  stroke="var(--on-primary)"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <title>{r.alert}</title>
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </g>
              )}

              {selected && (
                <g>
                  <circle cx={cx} cy={baseY - 14} r={9} fill="var(--canvas-night)" stroke="var(--on-primary)" strokeWidth={1.5} />
                  <text x={cx} y={baseY - 10} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--on-primary)">
                    {slot + 1}
                  </text>
                </g>
              )}

              {logo && (
                <g transform={`translate(${cx - LOGO / 2},${baseY + 8}) scale(${LOGO / 24})`} fill="var(--on-primary)" fillRule="evenodd" opacity={dim ? 0.4 : 0.9}>
                  <path d={logo} />
                </g>
              )}

              <text
                transform={`translate(${cx + 4},${baseY + 14 + LOGO + 8}) rotate(-45)`}
                textAnchor="end"
                fontSize={12}
                fontWeight={hot || selected ? 700 : 400}
                fill={hot || selected ? "var(--on-primary)" : "var(--on-primary-mute)"}
                opacity={dim ? 0.6 : 1}
              >
                {name}
              </text>
            </g>
          );
        })}

        <line x1={left} x2={left + innerW} y1={baseY} y2={baseY} stroke="var(--hairline-dark)" />
      </svg>
    </div>
  );
}
