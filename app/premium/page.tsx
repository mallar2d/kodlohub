import type { Metadata } from "next";
import PremiumClient from "./PremiumClient";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "KodloHUB Premium — Підтримка генерації слопу",
  description:
    "Оформіть KodloHUB Premium за 22 грн/міс: вимкнення реклами, ранній доступ до проєктів кодла, матеріали розробки та крутий підпис у хедері.",
  path: "/premium",
});

export default function PremiumPage() {
  return <PremiumClient />;
}
