import UnifiedArchiveClient, { type ArchiveTab } from "@/components/archive/UnifiedArchiveClient";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { getUnifiedArchiveData } from "@/lib/archive";

export const metadata = buildPageMetadata({
  title: "Архів Контенту — KodloHUB 2.0",
  description: "Єдиний цифровий архів медіа, блогу, артефактів та подкастів спільноти Кодло.",
  path: "/archive",
});

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: ArchiveTab; filter?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab || "all";
  const filter = params.filter || "all";
  const { media, posts, lore, podcasts } = await getUnifiedArchiveData();

  return (
    <UnifiedArchiveClient
      initialMedia={media}
      initialPosts={posts}
      initialLore={lore}
      initialPodcasts={podcasts}
      defaultTab={tab}
      initialFilter={filter}
    />
  );
}
