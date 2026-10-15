/** CSS variable for a colour slot (0..7). Defined in globals.css, themed per surface. */
export function slotColor(slot: number): string {
  return `var(--kb-s${slot + 1})`;
}
