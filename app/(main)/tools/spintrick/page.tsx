import SpinTrickClient from "./SpinTrickClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SPINTRICK",
  description:
    "Оберти телефон — отримай 😎. Комбо за обертання в одному напрямку.",
};

export default function SpinTrickPage() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        <p className="micro-cap text-ink-mute mb-2">KODLOHUB TOOLS</p>
        <h1 className="heading-section mb-8">SPINTRICK</h1>
        <SpinTrickClient />
      </div>
    </main>
  );
}
