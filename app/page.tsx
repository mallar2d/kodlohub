"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Media {
  id: string;
  file_url: string;
  file_type: string;
  caption: string;
  created_at: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
}

interface Stats {
  mediaCount: number;
  postsCount: number;
  profilesCount: number;
}

export default function HomePage() {
  const [recentMedia, setRecentMedia] = useState<Media[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats>({
    mediaCount: 0,
    postsCount: 0,
    profilesCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [mediaRes, postsRes, profilesRes] = await Promise.all([
        supabase
          .from("media")
          .select("id, file_url, file_type, caption, created_at")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("posts")
          .select("id, title, content, tags, created_at")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      setRecentMedia(mediaRes.data || []);
      setRecentPosts(postsRes.data || []);
      setStats({
        mediaCount: (mediaRes.data || []).length,
        postsCount: (postsRes.data || []).length,
        profilesCount: profilesRes.count || 0,
      });
      setLoading(false);
    }

    fetchData();
  }, [supabase]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="pt-24 pb-16 px-6">
        <div className="max-w-[1200px] mx-auto">
          <h1 className="heading-hero mb-4">KODLOHOST</h1>
          <p className="text-on-primary-mute text-xl max-w-2xl">
            Все, що створило кодло, в одному місці.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 pb-16">
        <div className="max-w-[1200px] mx-auto grid grid-cols-3 gap-4">
          {[
            { value: stats.profilesCount, label: "УЧАСНИКІВ" },
            { value: stats.mediaCount, label: "МЕДІА" },
            { value: stats.postsCount, label: "ПОСТІВ" },
          ].map((stat) => (
            <div key={stat.label} className="card-dark p-6 text-center">
              <p className="heading-sub text-on-primary">{stat.value}</p>
              <p className="micro-cap text-ink-mute mt-2">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent media */}
      <section className="px-6 pb-16">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="heading-sub">ОСТАННЄ</h2>
            <Link
              href="/gallery"
              className="micro-cap text-on-primary-mute hover:text-on-primary transition-opacity"
            >
              ДИВИТИСЬ ВСЕ →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : recentMedia.length === 0 ? (
            <div className="text-center py-16 card-dark rounded-lg">
              <p className="heading-sub text-hairline-dark mb-2">:(</p>
              <p className="text-on-primary-mute">
                Поки нічого немає. Завантажуй перший файл!
              </p>
              <Link
                href="/upload"
                className="btn-ghost text-on-primary mt-6 inline-block"
              >
                ЗАВАНТАЖИТИ
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {recentMedia.map((item) => (
                <Link
                  key={item.id}
                  href="/gallery"
                  className="group rounded-lg overflow-hidden bg-canvas-night-soft border border-hairline-dark hover:border-on-primary-mute transition-colors"
                >
                  {item.file_type === "image" ? (
                    <img
                      src={item.file_url}
                      alt={item.caption || "Медіа"}
                      className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : item.file_type === "video" ? (
                    <div className="w-full h-48 bg-canvas-night flex items-center justify-center">
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="text-ink-mute"
                      >
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-canvas-night flex items-center justify-center">
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="text-ink-mute"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                  )}
                  {item.caption && (
                    <div className="p-3">
                      <p className="caption text-on-primary-mute line-clamp-1">
                        {item.caption}
                      </p>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Recent posts */}
      <section className="px-6 pb-16">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="heading-sub">БЛОГ</h2>
            <Link
              href="/blog"
              className="micro-cap text-on-primary-mute hover:text-on-primary transition-opacity"
            >
              ЧИТАТИ ВСЕ →
            </Link>
          </div>

          {recentPosts.length === 0 ? (
            <div className="text-center py-16 card-dark rounded-lg">
              <p className="text-on-primary-mute">
                Постів поки немає. Напиши перший!
              </p>
              <Link
                href="/upload"
                className="btn-ghost text-on-primary mt-6 inline-block"
              >
                НАПИСАТИ
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.id}`}
                  className="card-dark p-6 hover:border-on-primary-mute transition-colors group"
                >
                  <h3 className="font-bold text-on-primary mb-2 group-hover:text-on-primary-mute transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-on-primary-mute text-sm line-clamp-3 mb-4">
                    {post.content.slice(0, 150)}
                    {post.content.length > 150 ? "..." : ""}
                  </p>
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="micro-cap px-2 py-0.5 rounded bg-canvas-cool text-ink-mute text-[10px]"
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
      </section>

      {/* Quick links */}
      <section className="px-6 pb-16">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { href: "/gallery", title: "ГАЛЕРЕЯ", desc: "Фото та відео кодла" },
            {
              href: "/lore",
              title: "АРТЕФАКТИ",
              desc: "Архів артефактів та мемів",
            },
            { href: "/upload", title: "ЗАВАНТАЖИТИ", desc: "Додай щось своє" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="card-dark p-6 hover:border-on-primary-mute transition-colors group text-center"
            >
              <h3 className="font-bold text-on-primary mb-1 group-hover:text-on-primary-mute transition-colors">
                {link.title}
              </h3>
              <p className="caption text-ink-mute">{link.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
