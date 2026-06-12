import BratTDClient from "./BratTDClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BRAT TD",
  description: "Пародійний Tower Defense про Подро, молотки, Nescafe Gold та накати Братви.",
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
