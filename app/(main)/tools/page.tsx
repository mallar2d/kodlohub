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
    <main className="min-h-screen pt-24 pb-20 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        <ToolsClient />
      </div>
    </main>
  );
}

