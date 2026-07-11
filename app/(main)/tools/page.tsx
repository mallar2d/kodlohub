import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Тулзи",
  description:
    "Інструменти для кодла — молоток, спінтрік, аудіо-комбайнер та магічна куля.",
  path: "/tools",
});

const tools = [
  {
    href: "/tools/audio-combiner",
    name: "PDRLIFY",
    description:
      "Додай PDR звук до будь-якого аудіофайлу з налаштовуваною затримкою",
  },
  {
    href: "/tools/magic-8ball",
    name: "PODRO-BALL",
    description: "Магічна куля відповідей. Запитай щось і потряси.",
  },
  {
    href: "/tools/spintrick",
    name: "SPINTRICK",
    description: "Оберти телефон — отримай 😎. Комбо за обертання в одному напрямку.",
  },
  {
    href: "/tools/podro-nmt",
    name: "ПОДРО-НМТ",
    description: "Національний мультипредметний тест про легенду ФІКТ. 40 питань, одна офіційна спроба.",
  },
  {
    href: "/tools/hammer",
    name: "МОЛОТОК",
    description: "Раз на годину — БАБАХ! Глобальний лідерборд йобнутих.",
  },
  {
    href: "/tools/podro-clicker",
    name: "ПОДРО-КЛІКЕР",
    description:
      "Клікер про Подро. Вари НЕСКАФЕ ГОЛД, найми помічників, апгрейдь і шеметуйся за повагу.",
  },
  {
    href: "/tools/brat-td",
    name: "BRAT TD",
    description: "Пародійний Tower Defense про Подро, молотки, Nescafe Gold та накати Братви.",
  },
  {
    href: "/tools/kodlo-arena",
    name: "HALF BRAT",
    description:
      "Deathmatch Kodlo Arena. Логін через KodloHUB, ігровий нік, статистика й лідерборд.",
  },
  {
    href: "/tools/slopus",
    name: "СЛОПУС AI",
    description: "ШІ-агент Слопус. Знає все про сайт, гру Брат ТД, документи та лор. Твій гід та помічник.",
  },
];

export default function ToolsPage() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        <p className="micro-cap text-ink-mute mb-2">KODLOHUB TOOLS</p>
        <h1 className="heading-section mb-8">ТУЛЗИ</h1>

        <div className="grid gap-4">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="card-dark p-6 hover:border-on-primary-mute transition-colors group block"
            >
              <h2 className="button-cap text-on-primary mb-2 group-hover:opacity-80 transition-opacity">
                {tool.name}
              </h2>
              <p className="text-on-primary-mute text-sm">{tool.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
