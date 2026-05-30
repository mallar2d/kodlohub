import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import ProfileClient from "./ProfileClient";

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
  async (id: string): Promise<{ profile: Profile | null; posts: Post[]; media: Media[] }> => {
    const supabase = createAdminClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (!profile) {
      return { profile: null, posts: [], media: [] };
    }

    const [postsRes, mediaRes] = await Promise.all([
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
    ]);

    return {
      profile: profile as Profile,
      posts: (postsRes.data || []) as Post[],
      media: (mediaRes.data || []) as Media[],
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
  const { profile, posts, media } = await getProfileData(id);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="heading-sub text-hairline-dark mb-4">:(</p>
          <p className="text-on-primary-mute">брєдік в чат нє пішем — профіль не знайдено</p>
        </div>
      </div>
    );
  }

  return <ProfileClient profile={profile} initialPosts={posts} initialMedia={media} />;
}
