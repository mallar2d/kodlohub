import HammerClient from "./HammerClient";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "МОЛОТОК",
  description:
    "Раз на годину — БАБАХ! Глобальний лідерборд йобнутих ударів.",
  path: "/tools/hammer",
});

export default function HammerPage() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        <p className="micro-cap text-ink-mute mb-2">KODLOHUB TOOLS</p>
        <h1 className="heading-section mb-8">МОЛОТОК</h1>
        <HammerClient />
      </div>
    </main>
  );
}
