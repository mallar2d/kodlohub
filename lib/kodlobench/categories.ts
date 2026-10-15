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

export const DEFAULT_CATEGORY_ID = CATEGORIES[0].id;

export function getCategory(id: string | undefined | null): KodloBenchCategory | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function isCategoryId(id: unknown): id is string {
  return typeof id === "string" && CATEGORIES.some((c) => c.id === id);
}
