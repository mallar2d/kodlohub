import DocsClient from "./DocsClient";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Документація API",
  description:
    "Повна документація KodloHUB API v1 — автентифікація, scopes, rate limits, webhooks і довідник усіх ендпоінтів.",
  path: "/docs",
});

export default function DocsPage() {
  return <DocsClient />;
}
