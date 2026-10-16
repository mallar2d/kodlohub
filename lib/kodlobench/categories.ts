export interface KodloBenchCategory {
  id: string;
  name: string;
  caption: string;
}

/** Four public categories. There is intentionally no combined/overall category. */
export const CATEGORIES: readonly KodloBenchCategory[] = [
  {
    id: "pdrbench-pro",
    name: "PDRBench-Pro",
    caption:
      "Аналіз і генерація текстового слопу на основі Podro.TXT. Перевірка роботи з контекстом, творчості та меж моделі у взаємодії з абсурдним контентом.",
  },
  {
    id: "redotui-bench",
    name: "REDOTUI-Bench",
    caption:
      "Відтворення інтерфейсу за текстовими інструкціями й візуальними референсами. Створення UI в Godot без вебтехнологій: важливі точність, цілісність оформлення та увага до деталей.",
  },
  {
    id: "utwmr-rec-bench",
    name: "UTWMR-REC-Bench",
    caption:
      "Створення з нуля складної ігрової системи з взаємопов’язаними механіками та послідовною логікою. Зовнішні ресурси заборонені. Візуал другорядний, але має залишатися зрозумілим і не заважати грі.",
  },
  {
    id: "3dsc-gt-plus",
    name: "3DSC-GT+",
    caption:
      "Фінальний творчий тест: створення унікальної 3D-сцени, яка поєднує сценарій, візуал, анімацію та режисуру. Важливе цілісне враження від готової роботи. Зовнішні ресурси заборонені.",
  },
] as const;

/** Per-category maximum of the published score, in the units used in the data file. */
export const CATEGORY_SCORE_MAX = 550;

export const OVERALL_ID = "overall";

/**
 * The overall score is the sum of the four category scores (every coefficient is 1).
 * It is derived on the server and never read from the data file. Displayed value = raw sum / 100.
 */
export const OVERALL_DIVISOR = 100;
export const OVERALL_SCORE_MAX = (CATEGORIES.length * CATEGORY_SCORE_MAX) / OVERALL_DIVISOR;

export const OVERALL: KodloBenchCategory = {
  id: OVERALL_ID,
  name: "Загальний",
  caption:
    "Сума балів чотирьох категорій, коефіцієнт кожної дорівнює 1. Максимум 22,00. Показується лише для конфігурацій, які мають результат у всіх чотирьох категоріях.",
};

/** Description of the overall view when some categories are left out of the total. */
export function overallCaption(excludedNames: readonly string[]): string {
  if (excludedNames.length === 0) return OVERALL.caption;
  const kept = CATEGORIES.length - excludedNames.length;
  return `Сума балів ${kept === 1 ? "однієї категорії" : kept === 2 ? "двох категорій" : "трьох категорій"} без ${excludedNames.join(", ")}, коефіцієнт кожної дорівнює 1, приведена до того самого максимуму 22,00. Показується лише для конфігурацій, які мають результат у всіх категоріях, що враховуються.`;
}

/** Tabs shown on the page: the overall view first, then the four categories. */
export const VIEW_CATEGORIES: readonly KodloBenchCategory[] = [OVERALL, ...CATEGORIES];

export const DEFAULT_CATEGORY_ID = OVERALL_ID;

/** Upper bound of the score axis for a view (data may still exceed it). */
export function scoreMaxFor(categoryId: string): number {
  return categoryId === OVERALL_ID ? OVERALL_SCORE_MAX : CATEGORY_SCORE_MAX;
}

export function getCategory(id: string | undefined | null): KodloBenchCategory | undefined {
  return VIEW_CATEGORIES.find((c) => c.id === id);
}

/** True for the overall view or one of the four categories (what the URL may name). */
export function isViewCategoryId(id: unknown): id is string {
  return typeof id === "string" && VIEW_CATEGORIES.some((c) => c.id === id);
}

export function isCategoryId(id: unknown): id is string {
  return typeof id === "string" && CATEGORIES.some((c) => c.id === id);
}
