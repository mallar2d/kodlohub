import type { Metadata } from "next";
import DocsClient from "./DocsClient";

export const metadata: Metadata = {
  title: "Документація API",
  description:
    "Повна документація KodloHUB API v1 — автентифікація, scopes, rate limits, webhooks і довідник усіх ендпоінтів.",
};

export default function DocsPage() {
  return <DocsClient />;
}
