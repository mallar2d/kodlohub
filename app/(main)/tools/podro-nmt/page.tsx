import NmtClient from "./NmtClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ПОДРО-НМТ",
  description: "Національний мультипредметний тест про Подро. 40 питань, одна офіційна спроба.",
};

export default function NmtPage() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        <p className="micro-cap text-ink-mute mb-2">KODLOHUB TOOLS</p>
        <h1 className="heading-section mb-8">ПОДРО-НМТ</h1>
        <NmtClient />
      </div>
    </main>
  );
}
