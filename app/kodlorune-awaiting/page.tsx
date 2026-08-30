import { buildPageMetadata } from "@/lib/seo";
import KodloruneAwaitingClient from "./KodloruneAwaitingClient";

export const metadata = buildPageMetadata({
  title: "KODLORUNE IS AWAITING — Розробку відновлено",
  description: "Офіційне оголошення: розробку гри KODLORUNE офіційно відновлено.",
  path: "/kodlorune-awaiting",
});

export default function KodloruneAwaitingPage() {
  return <KodloruneAwaitingClient />;
}
