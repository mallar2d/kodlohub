import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "@/lib/seo";
import { verifyServerPremiumAccess } from "@/lib/premium/server";
import PremiumProjectTemplate, { PremiumProjectMeta } from "@/components/premium/PremiumProjectTemplate";
import PremiumProtectedWrapper from "@/components/premium/PremiumProtectedWrapper";

const PROJECTS_DATA: Record<string, PremiumProjectMeta> = {
  kodlorune: {
    slug: "kodlorune",
    title: "Кодлоруна",
    phase: "АКТИВНА РОЗРОБКА",
    tag: "PREMIUM ЕКСКЛЮЗИВ",
    logline: "Ексклюзивні матеріали розробки, концепт-арти, напрацювання лору та закриті білди Кодлоруни.",
    version: "v0.4.0-godot",
    engine: "Godot Engine (раніше Web)",
    statusText: "Розробка на Godot",
    posts: [
      {
        id: "kodlorune-devlog-2-seven-souls",
        title: "Девлог #2: Сім душ, Торпеда буття та 3D Кабан — Новий босфайт",
        version: "v0.4.1-gdd",
        date: "2 вересня 2026",
        excerpt:
          "Повні деталі нової бойової системи: фальшивий «Подро», 6 помічників-хуманізацій, Mario Kart дрифт, дельфінячий стрибок у воді та 3D-монумент Кабана.",
        pinned: true,
        tags: ["Godot", "Kodlorune", "Devlog", "BossFight", "7Souls", "3DBoar"],
        content: [
          "Ми завершили розробку геймдизайн-документа для оновленої битви з «ПОДРО». Головне натхнення — бій з Flowery (Deltarune Chapter 5). Наш бос — це стерильна, фальшива версія Подро без дурощів і матюків, що прикидається ідеалом.",
          "Першу фазу під класичну Червону душу «Подро» починає абсолютно сам. Але далі він кличе на допомогу 6 помічників — хуманізацій культових речей лору, які змінюють режим душі (як квіти в 5-му чаптері Дельти):",
          "• Жовта (Yellow): Золотий Ковбой (Банка Nescafe Gold) — стрільба по жовтих кулях + заряджений Charge Shot.",
          "• Зелена (Green): Мідний Шеф (Турка Подро) — статичний 8-векторний щит і ритмічне відбивання киплячих крапель.",
          "• Синя (Blue): Балерино-мішалка (Дерев'яна ложка) — платформер із гравітацією та роздвоєнням душі гравця на два незалежних тіла.",
          "• Помаранчева (Orange): Торпеда (Торпеда буття) — слизька інерція, дрифт та гальмування на газонах трави за зразком Mario Kart!",
          "• Фіолетова (Purple): Сет-стратег (Телефон 22:00) — тактичне програмування черги дій (Z/X/C) на сітці під таймер детонації.",
          "• Аква (Aqua): Аква-пустунка (Бутель води з кар'єру) — плавучість, пірнання на глибину та інерційний дельфінячий стрибок над хвилею-цунамі.",
          "А в центрі всієї сцени, за спиною боса під паралаксним зоряним небом, велично й незворушно крутиться низькополігональна 3D-модель Кабана як вічний тотем сили Кодла!",
        ],
      },
      {
        id: "kodlorune-godot-reboot",
        title: "Перезапуск Кодлоруни: Перехід на Godot та оновлення бойової системи",
        version: "v0.4.0-godot",
        date: "31 серпня 2026",
        excerpt:
          "Гра робиться заново на повноцінному рушії Godot замість веб-слопу. Збереження ключових механік синьої душі та кардинальна переробка битви.",
        pinned: false,
        tags: ["Godot", "Kodlorune", "Devlog", "BlueSoul", "BattleSystem"],
        content: [
          "Розробка гри KODLORUNE офіційно стартувала заново на повноцінному рушії Godot замість початкового експериментального веб-слопу. Попередню браузерну версію можна подивитися тут: https://kodlohub.vercel.app/kodlorune",
          "Перехід на Godot дає змогу повністю контролювати частоту кадрів, точність колізій та позбутися обмежень веб-канвасу.",
          "Деякі елементи зі старої версії перенесуться: зокрема, фірмова механіка синьої душі (гравітація та стрибки всередині бокс-арени) та частина впізнаваних атак.",
          "При цьому сама битва зміниться кардинально і стане «ЗНАЧНО ЦІКАВІШОЮ)» — нові комплексні патерни атак, додаткові інтерактивні фази та покращена динаміка.",
          "Перші тестові білди та напрацювання будуть опубліковані в цьому розділі ексклюзивно для підписників KodloHUB Premium.",
        ],
      },
    ],
  },
  "brat-td-2": {
    slug: "brat-td-2",
    title: "Брат ТД 2",
    phase: "ПРЕ-ПРОДАКШН",
    tag: "В РОЗРОБЦІ",
    logline: "Офіційний сиквел Brat TD: нові типи веж, механіки хвиль, спрайти та концепт-арти.",
    version: "v0.1.0-concept",
    engine: "HTML5 / TS",
    statusText: "Концепт & механіки",
  },
  "super-kladman": {
    slug: "super-kladman",
    title: "Супер Кладмен",
    phase: "ПРОТОТИП",
    tag: "В РОЗРОБЦІ",
    logline: "Новий проєкт кодла: дизайн рівнів, механіки пошуку, спрайти та чернетки розробки.",
    version: "v0.1.0-proto",
    engine: "Custom Engine",
    statusText: "Прототип механік",
  },
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = PROJECTS_DATA[slug];

  if (!project) {
    return buildPageMetadata({
      title: "Проєкт не знайдено",
      description: "Сторінка преміум-проєкту не існує.",
      path: `/premium/${slug}`,
    });
  }

  return buildPageMetadata({
    title: `${project.title} (Premium) — KodloHUB`,
    description: project.logline,
    path: `/premium/${slug}`,
  });
}

export default async function PremiumProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const project = PROJECTS_DATA[slug];

  if (!project) {
    notFound();
  }

  const { isPremium } = await verifyServerPremiumAccess();

  // If server confirmed isPremium, render directly on server
  if (isPremium) {
    return <PremiumProjectTemplate project={project} />;
  }

  // Otherwise, use protected wrapper with lock screen
  return <PremiumProtectedWrapper project={project} />;
}
