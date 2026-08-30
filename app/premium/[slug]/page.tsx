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
    version: "v0.3.0-dev",
    engine: "Custom WebGL / Canvas",
    statusText: "Внутрішній білд",
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
