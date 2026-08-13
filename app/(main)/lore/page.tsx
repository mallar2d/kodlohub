import UnifiedArchiveClient from "@/components/archive/UnifiedArchiveClient";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { getUnifiedArchiveData } from "@/lib/archive";

const categoryMetadata: Record<string, { title: string; description: string }> = {
  all: { title: "Артефакти та Лор", description: "Архів артефактів, хронік та мемів кодла." },
  person: { title: "Люди — Артефакти", description: "Люди кодла в архіві KodloHUB." },
  event: { title: "Події — Артефакти", description: "Події та історії кодла в архіві KodloHUB." },
  artifact: { title: "Артефакти — Архів", description: "Предмети, знахідки та артефакти кодла." },
  meme: { title: "Меми — Артефакти", description: "Меми кодла в архіві KodloHUB." },
  quote: { title: "Цитати — Артефакти", description: "Цитати та фрази кодла в архіві KodloHUB." },
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}): Promise<Metadata> {
  const { category = "all" } = await searchParams;
  const current = categoryMetadata[category] || categoryMetadata.all;

  return buildPageMetadata({
    ...current,
    path: category === "all" ? "/lore" : `/lore?category=${category}`,
  });
}

export default async function LorePage() {
  const { media, posts, lore, podcasts } = await getUnifiedArchiveData();

  return (
    <UnifiedArchiveClient
      initialMedia={media}
      initialPosts={posts}
      initialLore={lore}
      initialPodcasts={podcasts}
      defaultTab="lore"
    />
  );
}

