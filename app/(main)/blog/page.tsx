import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import Link from "next/link";

interface Post {
  id: string;
  title: string;
  content: string;
  tags: string[] | null;
  type: string;
  status: string;
  created_at: string;
  author_id: string;
  like_count?: number;
  profiles?: { display_name: string; username: string } | null;
}

const getPosts = unstable_cache(
  async (): Promise<Post[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("posts")
      .select("*, profiles(display_name, username), likes:likes(id)")
      .eq("status", "approved");

    const postsWithLikes = (data || []).map((p: any) => ({
      ...p,
      like_count: p.likes?.length || 0,
      profiles: p.profiles?.[0] || null,
    }));

    postsWithLikes.sort((a: Post, b: Post) => (b.like_count || 0) - (a.like_count || 0));

    return postsWithLikes;
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

        {/* Posts */}
        {posts.length === 0 ? (
          <div className="text-center py-24">
            <p className="heading-sub text-hairline-dark mb-4">:(</p>
            <p className="text-on-primary-mute">
              брєдік в чат нє пішем — постів поки немає
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.id}`}
                className="card-dark p-6 hover:border-on-primary-mute transition-colors group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="button-cap px-3 py-1 rounded-full border border-hairline-dark text-on-primary-mute">
                    {post.type === "blog"
                      ? "БЛОГ"
                      : post.type === "lore"
                        ? "АРТЕФАКТИ"
                        : "ПОДІЯ"}
                  </span>
                  <span className="caption text-ink-mute">
                    {new Date(post.created_at).toLocaleDateString("uk-UA")}
                  </span>
                </div>
                <h3 className="heading-sub text-on-primary mb-3 group-hover:text-on-primary-mute transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-on-primary-mute text-sm line-clamp-3 mb-4">
                  {post.content.slice(0, 200)}
                  {post.content.length > 200 ? "..." : ""}
                </p>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.tags.slice(0, 5).map((tag: string) => (
                      <span
                        key={tag}
                        className="micro-cap px-2 py-0.5 rounded bg-canvas-cool text-ink-mute"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {post.profiles && (
                  <div className="flex items-center justify-between">
                    <p className="caption text-ink-mute">
                      {post.profiles.display_name}
                    </p>
                    {(post.like_count || 0) > 0 && (
                      <div className="flex items-center gap-1 text-xs text-ink-mute">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span>{post.like_count}</span>
                      </div>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
