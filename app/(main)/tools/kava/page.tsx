import type { Metadata } from "next";
import KavaClient from "./KavaClient";

export const metadata: Metadata = {
  title: "KAVA HUB — Синхронізація Telegram та Кава 22:00 | KodloHUB",
  description: "Підключення Telegram акаунту від @podroid_bot. Клейм кави о 22:00, баланс, перекази та лідерборд.",
};

export default function KavaPage() {
  return <KavaClient />;
}
