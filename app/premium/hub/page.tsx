import type { Metadata } from "next";
import PremiumHubClient from "./PremiumHubClient";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Преміум-Хаб — Ексклюзивні матеріали KodloHUB",
  description: "Закритий хаб для підписників KodloHUB Premium: ранній доступ до проєктів, вихідні матеріали та архів слопу.",
  path: "/premium/hub",
});

export default function PremiumHubPage() {
  return <PremiumHubClient />;
}
