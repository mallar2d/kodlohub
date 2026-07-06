import AudioCombinerClient from "./AudioCombinerClient";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "PDRLIFY",
  description:
    "Додай PDR звук до будь-якого аудіофайлу з налаштовуваною затримкою.",
  path: "/tools/audio-combiner",
});

export default function AudioCombinerPage() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        <p className="micro-cap text-ink-mute mb-2">KODLOHUB TOOLS</p>
        <h1 className="heading-section mb-8">PDRLIFY</h1>
        <AudioCombinerClient />
      </div>
    </main>
  );
}
