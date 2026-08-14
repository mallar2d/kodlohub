import UrethraClient from "./UrethraClient";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "URETHRA.IO — Битва Опаришів за Каву",
  description:
    "Аналог Slither.io у всесвіті KodloHUB! Керуй опаришем в уретрі, їж зерна Nescafe Gold, відрощуй масу, підрізай інших опаришів і підкорюй світовий лідерборд.",
  path: "/tools/urethra",
});

export default function UrethraPage() {
  return (
    <main className="min-h-screen pt-20 pb-12 px-2 sm:px-4 flex flex-col items-center justify-center">
      <UrethraClient />
    </main>
  );
}
