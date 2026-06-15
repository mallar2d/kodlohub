import SlopusClient from "./SlopusClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clad Slopus AI",
  description: "ШІ-агент Clad Slopus — твій гід та помічник по всесвіту KodloHUB та грі Брат ТД.",
};

export default function SlopusPage() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        <p className="micro-cap text-ink-mute mb-2">KODLOHUB TOOLS</p>
        <h1 className="heading-section mb-8">Clad Slopus AI</h1>
        <SlopusClient />
      </div>
    </main>
  );
}
