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

const getProfileData = unstable_cache(
  async (id: string): Promise<{ profile: Profile | null; posts: Post[]; media: Media[]; commentCount: number }> => {
    const supabase = createAdminClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (!profile) {
      return { profile: null, posts: [], media: [], commentCount: 0 };
    }

    const [postsRes, mediaRes, postCommentsRes, mediaCommentsRes] = await Promise.all([
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
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("author_id", id),
      supabase
        .from("media_comments")
        .select("id", { count: "exact", head: true })
        .eq("author_id", id),
    ]);

    return {
      profile: profile as Profile,
      posts: (postsRes.data || []) as Post[],
      media: (mediaRes.data || []) as Media[],
      commentCount: (postCommentsRes.count || 0) + (mediaCommentsRes.count || 0),
    };
  },
  ["profile-data"],
  { revalidate: 60 }
);

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile, posts, media, commentCount } = await getProfileData(id);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyState message="профіль не знайдено" />
      </div>
    );
  }

  return <ProfileClient profile={profile} initialPosts={posts} initialMedia={media} commentCount={commentCount} />;
}
