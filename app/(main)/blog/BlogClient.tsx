"use client";

import { useState } from "react";
import Link from "next/link";
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
  profiles?: { display_name: string; username: string } | null;
}

export default function BlogClient({ initialPosts }: { initialPosts: Post[] }) {
  const [limit, setLimit] = useState(10);

  const paginatedPosts = initialPosts.slice(0, limit);

  return (
    <>
      {initialPosts.length === 0 ? (
        <EmptyState message="постів поки немає" />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paginatedPosts.map((post) => (
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
                  <p className="caption text-ink-mute">
                    {post.profiles.display_name}
                  </p>
                )}
              </Link>
            ))}
          </div>

          {/* Load more button */}
          {initialPosts.length > limit && (
            <div className="flex justify-center mt-12">
              <button
                onClick={() => setLimit((prev) => prev + 10)}
                className="btn-ghost text-on-primary"
              >
                ПОКАЗАТИ ЩЕ
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
