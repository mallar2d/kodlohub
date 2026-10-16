"use client";

import { familyLogoPath } from "@/lib/kodlobench/family-logos";
import { familyOf } from "@/lib/kodlobench/families";

/** Lab logo of a model's family: monochrome, transparent background, takes the current text colour. */
export default function FamilyLogo({ model, size = 14, className = "" }: { model: string; size?: number; className?: string }) {
  const d = familyLogoPath(familyOf(model).id);
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path d={d} />
    </svg>
  );
}
