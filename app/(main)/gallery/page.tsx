import UnifiedArchiveClient from "@/components/archive/UnifiedArchiveClient";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { getUnifiedArchiveData } from "@/lib/archive";

const filterMetadata: Record<string, { title: string; description: string }> = {
  all: { title: "Медіатека та Галерея", description: "Повний каталог фото, відео та матеріалів кодла в одному місці." },
  image: { title: "Фото — Медіатека", description: "Фотоархів кодла в медіатеці KodloHUB." },
  video: { title: "Відео — Медіатека", description: "Відеоархів кодла в медіатеці KodloHUB." },
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}): Promise<Metadata> {
  const { filter = "all" } = await searchParams;
  const current = filterMetadata[filter] || filterMetadata.all;

  return buildPageMetadata({
    ...current,
    path: filter === "all" ? "/gallery" : `/gallery?filter=${filter}`,
  });
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter = params.filter || "all";
  const { media, posts, lore, podcasts } = await getUnifiedArchiveData();

  return (
    <UnifiedArchiveClient
      initialMedia={media}
      initialPosts={posts}
      initialLore={lore}
      initialPodcasts={podcasts}
      defaultTab="media"
      initialFilter={filter}
    />
  );
}

