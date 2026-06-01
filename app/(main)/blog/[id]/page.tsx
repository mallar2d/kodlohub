import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import BlogPostClient from "./BlogPostClient";
import type { Metadata } from "next";
import EmptyState from "@/components/ui/EmptyState";

interface Post {
  id: string;
  title: string;
  content: string;
  tags: string[] | null;
  type: string;
  status: string;
  created_at: string;
  author_id: string;
  profiles?: { display_name: string; username: string; avatar_url: string | null } | null;
}

interface Comment {
  id: string;
  content: string;
  author_id: string;
  post_id: string;
  created_at: string;
  profiles?: { display_name: string; username: string; avatar_url: string | null } | null;
}

const getPost = unstable_cache(
  async (id: string): Promise<{ post: Post | null; comments: Comment[] }> => {
    const supabase = createAdminClient();

    const [postRes, commentsRes] = await Promise.all([
      supabase.from("posts").select("*, profiles(display_name, username, avatar_url)").eq("id", id).single(),
      supabase.from("comments").select("*, profiles(display_name, username, avatar_url)").eq("post_id", id).order("created_at", { ascending: true }),
    ]);

    const post = postRes.data ? {
      ...postRes.data,
      profiles: Array.isArray((postRes.data as any).profiles)
        ? (postRes.data as any).profiles[0]
        : (postRes.data as any).profiles || null
    } : null;

    const comments = (commentsRes.data || []).map((c: any) => ({
      ...c,
      profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles || null
    }));

    return {
      post: post as Post | null,
      comments: comments as Comment[],
    };
  },
  ["blog-post"],
  { revalidate: 30 }
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { post } = await getPost(id);

  if (!post) {
    return { title: "Пост не знайдено" };
  }

  return {
    title: post.title,
    description:
      post.content.length > 150
        ? post.content.slice(0, 150) + "..."
        : post.content,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { post, comments } = await getPost(id);

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyState message="пост не знайдено" />
      </div>
    );
  }

  return <BlogPostClient post={post} initialComments={comments} />;
}
