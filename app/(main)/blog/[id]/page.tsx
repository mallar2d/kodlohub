import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import BlogPostClient from "./BlogPostClient";

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
      supabase.from("posts").select("*").eq("id", id).single(),
      supabase.from("comments").select("*").eq("post_id", id).order("created_at", { ascending: true }),
    ]);

    return {
      post: postRes.data as Post | null,
      comments: (commentsRes.data || []) as Comment[],
    };
  },
  ["blog-post"],
  { revalidate: 30 }
);

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
        <div className="text-center">
          <p className="heading-sub text-hairline-dark mb-4">:(</p>
          <p className="text-on-primary-mute">брєдік в чат нє пішем — пост не знайдено</p>
        </div>
      </div>
    );
  }

  return <BlogPostClient post={post} initialComments={comments} />;
}
