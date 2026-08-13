import UnifiedArchiveClient from "@/components/archive/UnifiedArchiveClient";
import { buildPageMetadata } from "@/lib/seo";
import { getUnifiedArchiveData } from "@/lib/archive";

export const metadata = buildPageMetadata({
  title: "КодлоCAST Подкаст — KodloHUB 2.0",
  description: "Офіційний подкаст спільноти Кодло. Голоси, розмови та хроніки подій.",
  path: "/cast",
});

export default async function CastPage() {
  const { media, posts, lore, podcasts } = await getUnifiedArchiveData();

  return (
    <UnifiedArchiveClient
      initialMedia={media}
      initialPosts={posts}
      initialLore={lore}
      initialPodcasts={podcasts}
      defaultTab="podcasts"
    />
  );
}

