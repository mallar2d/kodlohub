import type { Metadata } from "next";
import DevelopersClient from "./DevelopersClient";

export const metadata: Metadata = {
  title: "API Документація",
  description: "KodloHUB REST API для ботів та інтеграцій — автентифікація, ендпоінти, webhooks.",
};

export default function DevelopersPage() {
  return <DevelopersClient />;
}
