import { familyOf } from "@/lib/kodlobench/families";

/** CSS colour of a model's family. Tokens are defined per theme in globals.css. */
export function familyColor(model: string): string {
  return `var(--kb-fam-${familyOf(model).id})`;
}
