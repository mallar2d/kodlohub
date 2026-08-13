import HammerClient from "./HammerClient";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "МОЛОТОК — KodloHUB 2.0",
  description:
    "Глобальний лідерборд ударів кодла. Раз на годину — БАБАХ! Спеціальний нічний режим о 22:00.",
  path: "/tools/hammer",
});

export default function HammerPage() {
  return (
    <main className="min-h-screen pt-28 pb-20 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        <HammerClient />
      </div>
    </main>
  );
}
