import type { Metadata } from "next";
import DevelopersClient from "./DevelopersClient";

export const metadata: Metadata = {
  title: "Для розробників",
  description: "KodloHUB API — отримай ключ доступу, зроби перший запит і будуй ботів та інтеграції.",
};

export default function DevelopersPage() {
  return <DevelopersClient />;
}
