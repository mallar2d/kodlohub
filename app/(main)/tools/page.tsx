import ToolsClient from "./ToolsClient";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Аркада & Тулзи — KodloHUB 2.0",
  description:
    "Ігри, утиліти, штучний інтелект та експерименти кодла: Brat TD, Half Brat Arena, Hammer Launcher, Слопус AI, Подроклікер та інші.",
  path: "/tools",
});

export default function ToolsPage() {
  return (
    <main className="min-h-screen pt-28 pb-20 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-10">
          <p className="micro-cap text-ink-mute mb-2">KODLOHUB 2.0 · ARCADE & LAB</p>
          <h1 className="heading-section mb-4">АРКАДА & ТУЛЗИ</h1>
          <p className="text-on-primary-mute text-base sm:text-lg max-w-2xl leading-relaxed">
            Всі ігри, сервіси, нейромережеві помічники та фанові інструменти кодла в єдиному інтерактивному центрі.
          </p>
        </div>

        <ToolsClient />
      </div>
    </main>
  );
}

