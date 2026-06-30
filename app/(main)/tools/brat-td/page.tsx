import BratTdSuggestionForm from "@/components/brat-td/SuggestionForm";
import BratTDClient from "./BratTDClient";
import ErrorBoundary from "./ErrorBoundary";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DEMO",
  description:
    "Beta-установщик Brat TD: Total PDR Edition для Windows уже доступний. Android і Linux плануються пізніше.",
  openGraph: {
    title: "DEMO",
    description:
      "Beta-установщик Brat TD: Total PDR Edition для Windows уже доступний. Android і Linux плануються пізніше.",
    url: "https://kodlohub.vercel.app/tools/brat-td",
    images: [
      {
        url: "/og-brattd.png",
        width: 1731,
        height: 909,
        alt: "DEMO",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DEMO",
    description:
      "Beta-установщик Brat TD: Total PDR Edition для Windows уже доступний. Android і Linux плануються пізніше.",
    images: ["/og-brattd.png"],
  },
};

export default function BratTDPage() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6 bg-canvas-night">
      <div className="max-w-[1200px] mx-auto">
        <p className="micro-cap text-ink-mute mb-2">KODLOHUB MINI-GAME</p>
        <h1 className="heading-section mb-6">DEMO</h1>

        <section className="card-dark mb-8 border-on-primary-mute bg-canvas-night-soft/80 p-6">
          <p className="micro-cap text-ink-mute mb-2">BETA ВЖЕ ДОСТУПНА</p>
          <h2 className="heading-sub mb-3">Brat TD: Total PDR Edition</h2>
          <div className="max-w-3xl space-y-4 text-ink-mute leading-relaxed">
            <p>
              Установщик для Windows уже доступний до завантаження. Це
              Beta-версія гри, тому можливі графічні недоліки та проблеми з
              продуктивністю.
            </p>
            <p>Версії для Android і Linux плануються пізніше.</p>
          </div>
          <a
            href="/Brat%20TD_0.8.0_x64-setup.exe"
            download
            className="btn-ghost mt-6 inline-flex text-on-primary"
          >
            Завантажити для Windows
          </a>
        </section>

        <BratTdSuggestionForm />

        <ErrorBoundary>
          <BratTDClient />
        </ErrorBoundary>
      </div>
    </main>
  );
}
