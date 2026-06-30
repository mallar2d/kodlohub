export const BRAT_TD_SUGGESTION_TAGS = [
  { id: "bug_fix", label: "Баг фікс" },
  { id: "update", label: "Оновлення" },
  { id: "balance", label: "Баланс" },
  { id: "qol", label: "QoL" },
  { id: "content", label: "Контент" },
  { id: "ui", label: "UI/UX" },
  { id: "performance", label: "Продуктивність" },
  { id: "other", label: "Інше" },
] as const;

export type BratTdSuggestionTagId = (typeof BRAT_TD_SUGGESTION_TAGS)[number]["id"];

const TAG_LABELS = Object.fromEntries(
  BRAT_TD_SUGGESTION_TAGS.map((tag) => [tag.id, tag.label]),
) as Record<BratTdSuggestionTagId, string>;

export function getSuggestionTagLabel(tagId: string): string {
  return TAG_LABELS[tagId as BratTdSuggestionTagId] ?? tagId;
}

export const VALID_SUGGESTION_TAG_IDS = new Set<string>(
  BRAT_TD_SUGGESTION_TAGS.map((tag) => tag.id),
);
