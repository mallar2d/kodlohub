import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import ProfileClient from "./ProfileClient";
import type { Metadata } from "next";
import EmptyState from "@/components/ui/EmptyState";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { profile } = await getProfileData(id);

  if (!profile) {
    return { title: "Профіль не знайдено" };
  }

  return {
    ...buildPageMetadata({
      title: `${profile.display_name} (@${profile.username})`,
      description: profile.bio || `Профіль користувача ${profile.display_name} на KodloHUB.`,
      path: `/profile/${profile.id}`,
      image: profile.avatar_url,
      type: "profile",
    }),
  };
}

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  created_at: string;
  telegram_id?: string | null;
  telegram_username?: string | null;
  kava_balance_cache?: number;
}

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface Media {
  id: string;
  file_url: string;
  file_type: string;
  caption: string | null;
  created_at: string;
  lore_items?: { id: string }[] | null;
}

interface UserProject {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  status: string;
  progress_percent: number;
  types: string[] | null;
  created_at: string;
}

interface UserWiki {
  id: string;
  slug: string;
  title: string;
  view_count: number;
  created_at: string;
  wiki_categories?: { name: string; slug: string; icon: string } | null;
}

interface UserLore {
  id: string;
  title: string;
  description: string | null;
  category: string;
  created_at: string;
}

const getProfileData = unstable_cache(
  async (id: string): Promise<{
    profile: Profile | null;
    posts: Post[];
    media: Media[];
    projects: UserProject[];
    wikiArticles: UserWiki[];
    loreItems: UserLore[];
    commentCount: number;
  }> => {
    const supabase = createAdminClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (!profile) {
      return {
        profile: null,
        posts: [],
        media: [],
        projects: [],
        wikiArticles: [],
        loreItems: [],
        commentCount: 0,
      };
    }

    const [postsRes, mediaRes, projectsRes, wikiRes, loreRes, postCommentsRes, mediaCommentsRes] = await Promise.all([
      supabase
        .from("posts")
        .select("id, title, content, created_at")
        .eq("author_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("media")
        .select("id, file_url, file_type, caption, created_at")
        .eq("author_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("projects")
        .select("id, slug, title, short_description, status, progress_percent, types, created_at")
        .eq("created_by", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("wiki_articles")
        .select("id, slug, title, view_count, created_at, wiki_categories(name, slug, icon)")
        .eq("author_id", id)
        .eq("is_published", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("lore_items")
        .select("id, title, description, category, created_at")
        .eq("author_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("author_id", id),
      supabase
        .from("media_comments")
        .select("id", { count: "exact", head: true })
        .eq("author_id", id),
    ]);

    const wikiArticles = (wikiRes.data || []).map((a: any) => ({
      ...a,
      wiki_categories: Array.isArray(a.wiki_categories) ? a.wiki_categories[0] : a.wiki_categories || null,
    }));

    return {
      profile: profile as Profile,
      posts: (postsRes.data || []) as Post[],
      media: (mediaRes.data || []) as Media[],
      projects: (projectsRes.data || []) as UserProject[],
      wikiArticles: wikiArticles as UserWiki[],
      loreItems: (loreRes.data || []) as UserLore[],
      commentCount: (postCommentsRes.count || 0) + (mediaCommentsRes.count || 0),
    };
  },
  ["profile-data-v2"],
  { revalidate: 60 }
);

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile, posts, media, projects, wikiArticles, loreItems, commentCount } = await getProfileData(id);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyState message="профіль не знайдено" />
      </div>
    );
  }

  return (
    <ProfileClient
      profile={profile}
      initialPosts={posts}
      initialMedia={media}
      initialProjects={projects}
      initialWikiArticles={wikiArticles}
      initialLoreItems={loreItems}
      commentCount={commentCount}
    />
  );
}

