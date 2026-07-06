import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import BlogClient from "./BlogClient";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Блог",
  description: "Статті, новини та історії від кодла.",
  path: "/blog",
});

interface Post {
  id: string;
  title: string;
  content: string;
  tags: string[] | null;
  type: string;
  status: string;
  created_at: string;
  author_id: string;
  profiles?: { display_name: string; username: string } | null;
}

const getPosts = unstable_cache(
  async (): Promise<Post[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("posts")
      .select("*, profiles(display_name, username)")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    return (data || []).map((p: any) => ({
      ...p,
      profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles || null
    }));
  },
  ["blog-posts"],
  { revalidate: 30 }
);

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="micro-cap text-ink-mute mb-2">ПИШЕМО ПРО ПОДРО</p>
          <h1 className="heading-section mb-4">БЛОГ</h1>
        </div>

        <BlogClient initialPosts={posts} />
      </div>
    </div>
  );
}
