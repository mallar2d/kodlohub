import BratTDClient from "./BratTDClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BRAT TD — Накат Братви",
  description: "Пародійний Tower Defense про Подро, молотки, Nescafe Gold та скажені накати Братви. Захисти свій граніт від джонів та дрон-братів!",
  openGraph: {
    title: "BRAT TD — Накат Братви",
    description: "Пародійний Tower Defense про Подро, молотки, Nescafe Gold та скажені накати Братви. Захисти свій граніт від джонів та дрон-братів!",
    url: "https://kodlohub.vercel.app/tools/brat-td",
    images: [
      {
        url: "/og-brattd.png",
        width: 1024,
        height: 1024,
        alt: "BRAT TD — Накат Братви",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BRAT TD — Накат Братви",
    description: "Пародійний Tower Defense про Подро, молотки, Nescafe Gold та скажені накати Братви.",
    images: ["/og-brattd.png"],
  },
};

export default function BratTDPage() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6 bg-canvas-night">
      <div className="max-w-[1200px] mx-auto">
        <p className="micro-cap text-ink-mute mb-2">KODLOHUB MINI-GAME</p>
        <h1 className="heading-section mb-8">BRAT TD</h1>
        <BratTDClient />
      </div>
    </main>
  );
}
