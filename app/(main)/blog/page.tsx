"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Post {
  id: string;
  title: string;
  content: string;
  tags: string[];
  type: string;
  created_at: string;
  author_id: string;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function fetchPosts() {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      setPosts(data || []);
      setLoading(false);
    }

    fetchPosts();
  }, [supabase]);

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="micro-cap text-ink-mute mb-2">ПИШЕМО ПРО ПОДРО</p>
          <h1 className="heading-section mb-4">БЛОГ</h1>
        </div>

        {/* Posts */}
        {loading ? (
          <div className="text-center py-24">
            <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : posts.length === 0 ? (
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

                <h2 className="font-bold text-xl mb-3 text-on-primary group-hover:text-on-primary-mute transition-colors">
                  {post.title}
                </h2>

                <p className="text-on-primary-mute text-sm line-clamp-3 mb-4">
                  {post.content.slice(0, 200)}
                  {post.content.length > 200 ? "..." : ""}
                </p>

                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="micro-cap px-2 py-1 rounded bg-canvas-night-soft text-on-primary-mute border border-hairline-dark"
                      >
                        {tag}
                      </span>
                    ))}
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
