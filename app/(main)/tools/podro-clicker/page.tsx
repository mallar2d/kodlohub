import type { Metadata } from "next";
import PodroClickerClient from "./PodroClickerClient";

export const metadata: Metadata = {
  title: "ПОДРО-КЛІКЕР",
  description:
    "Клікер про Подро. Вари НЕСКАФЕ ГОЛД, найми помічників, відкривай апгрейди, ловИ бонус 22:00 та шеметуйся за перманентну повагу.",
};

export default function PodroClickerPage() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        <p className="micro-cap text-ink-mute mb-2">KODLOHUB TOOLS</p>
        <h1 className="heading-section mb-2">ПОДРО-КЛІКЕР</h1>
        <p className="text-on-primary-mute text-sm mb-8 max-w-xl">
          Клікай на Подро — він варить тобі НЕСКАФЕ ГОЛД. Найми помічників,
          купуй апгрейди, лови критичні удари і бонус рівно о 22:00. Коли
          набереш мільйон грамів — можеш ШЕМЕТУВАТИСЯ за перманентну повагу.
        </p>
        <PodroClickerClient />
      </div>
    </main>
  );
}
