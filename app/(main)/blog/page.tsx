import UnifiedArchiveClient from "@/components/archive/UnifiedArchiveClient";
import { buildPageMetadata } from "@/lib/seo";
import { getUnifiedArchiveData } from "@/lib/archive";

export const metadata = buildPageMetadata({
  title: "Блог Спільноти — KodloHUB 2.0",
  description: "Статті, новини, хроніки та історії від учасників кодла.",
  path: "/blog",
});

export default async function BlogPage() {
  const { media, posts, lore, podcasts } = await getUnifiedArchiveData();

  return (
    <UnifiedArchiveClient
      initialMedia={media}
      initialPosts={posts}
      initialLore={lore}
      initialPodcasts={podcasts}
      defaultTab="posts"
    />
  );
}

