"use client";

import { useMemo } from "react";
import { FAMILIES, OTHER_FAMILY, familyOf } from "@/lib/kodlobench/families";
import { familyLogoPath } from "@/lib/kodlobench/family-logos";
import type { PublishedResult } from "@/lib/kodlobench/types";

/** Colour key for the model families present in the current view (a colour is never shown without its name). */
export default function FamilyLegend({ rows }: { rows: PublishedResult[] }) {
  const present = useMemo(() => {
    const ids = new Set(rows.map((r) => familyOf(r.model).id));
    return [...FAMILIES, OTHER_FAMILY].filter((f) => ids.has(f.id));
  }, [rows]);

  if (present.length === 0) return null;
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-label="Сімейства моделей">
      {present.map((f) => (
        <li key={f.id} className="inline-flex items-center gap-1.5 text-xs text-on-primary-mute">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: `var(--kb-fam-${f.id})` }} aria-hidden="true" />
          {familyLogoPath(f.id) && (
            <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden="true" className="text-on-primary shrink-0">
              <path d={familyLogoPath(f.id) as string} />
            </svg>
          )}
          {f.label}
        </li>
      ))}
    </ul>
  );
}
