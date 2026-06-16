import BratTDClient from "./BratTDClient";
import ErrorBoundary from "./ErrorBoundary";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BRAT TD — Накат Братви",
  description:
    "Пародійний Tower Defense про Подро, молотки, Nescafe Gold та скажені накати Братви. Захисти свій граніт від джонів та дрон-братів!",
  openGraph: {
    title: "BRAT TD — Накат Братви",
    description:
      "Пародійний Tower Defense про Подро, молотки, Nescafe Gold та скажені накати Братви. Захисти свій граніт від джонів та дрон-братів!",
    url: "https://kodlohub.vercel.app/tools/brat-td",
    images: [
      {
        url: "/og-brattd.png",
        width: 1731,
        height: 909,
        alt: "BRAT TD — Накат Братви",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BRAT TD — Накат Братви",
    description:
      "Пародійний Tower Defense про Подро, молотки, Nescafe Gold та скажені накати Братви.",
    images: ["/og-brattd.png"],
  },
};

export default function BratTDPage() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6 bg-canvas-night">
      <div className="max-w-[1200px] mx-auto">
        <p className="micro-cap text-ink-mute mb-2">KODLOHUB MINI-GAME</p>
        <h1 className="heading-section mb-6">BRAT TD</h1>

        <section className="card-dark mb-8 border-on-primary-mute bg-canvas-night-soft/80 p-6">
          <p className="micro-cap text-ink-mute mb-2">СКОРО ДОСТУПНО</p>
          <h2 className="heading-sub mb-3">Brat TD: Total PDR Edition</h2>
          <p className="text-ink-mute max-w-3xl leading-relaxed">
            Повне PDR-видання скоро стане доступним до завантаження. Готуй місце
            на диску, тримай граніт під контролем і чекай на тотальний накат
            братви.
          </p>
        </section>

        <ErrorBoundary>
          <BratTDClient />
        </ErrorBoundary>
      </div>
    </main>
  );
}
