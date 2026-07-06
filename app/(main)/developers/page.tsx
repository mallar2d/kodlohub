import DevelopersClient from "./DevelopersClient";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Для розробників",
  description: "KodloHUB API — отримай ключ доступу, зроби перший запит і будуй ботів та інтеграції.",
  path: "/developers",
});

export default function DevelopersPage() {
  return <DevelopersClient />;
}
