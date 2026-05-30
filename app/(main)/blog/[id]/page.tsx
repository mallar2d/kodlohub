"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";

interface Post {
  id: string;
  title: string;
  content: string;
  tags: string[];
  type: string;
  created_at: string;
  author_id: string;
  profiles?: { display_name: string; username: string };
}

export default function BlogPostPage() {
  const params = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function fetchPost() {
      const { data } = await supabase
        .from("posts")
        .select("*, profiles(display_name, username)")
        .eq("id", params.id)
        .single();

      setPost(data);
      setLoading(false);
    }

    fetchPost();
  }, [params.id, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="heading-sub text-hairline-dark mb-4">:(</p>
          <p className="text-on-primary-mute">
            брєдік в чат нє пішем — пост не знайдено
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <article className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="button-cap px-3 py-1 rounded-full border border-hairline-dark text-on-primary-mute">
              {post.type === "blog"
                ? "БЛОГ"
                : post.type === "lore"
                ? "ЛОРА"
                : "ПОДІЯ"}
            </span>
            <span className="caption text-ink-mute">
              {new Date(post.created_at).toLocaleDateString("uk-UA")}
            </span>
          </div>

          <h1 className="heading-sub mb-6">{post.title}</h1>

          {post.profiles && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-canvas-cool flex items-center justify-center text-ink font-bold">
                {post.profiles.display_name?.charAt(0) || "?"}
              </div>
              <div>
                <p className="font-bold text-on-primary">
                  {post.profiles.display_name}
                </p>
                <p className="caption text-ink-mute">
                  @{post.profiles.username}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-lg max-w-none">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-12 pt-8 border-t border-hairline-dark">
            <p className="micro-cap text-ink-mute mb-3">ТЕГИ</p>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="button-cap px-3 py-1 rounded-full border border-hairline-dark text-on-primary-mute"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
