import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import Image from "next/image";

interface Post {
  id: string;
  title: string;
  content: string;
  tags: string[] | null;
  created_at: string;
  profiles?: { display_name: string } | null;
}

interface Media {
  id: string;
  file_url: string;
  file_type: string;
  caption: string | null;
  created_at: string;
}

interface Stats {
  mediaCount: number;
  postsCount: number;
  profilesCount: number;
}

const getRecentMedia = unstable_cache(
  async (): Promise<Media[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("media")
      .select("id, file_url, file_type, caption, created_at")
      .order("created_at", { ascending: false })
      .limit(6);
    return data || [];
  },
  ["recent-media"],
  { revalidate: 60 }
);

const getRecentPosts = unstable_cache(
  async (): Promise<Post[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("posts")
      .select("id, title, content, tags, created_at, profiles(display_name)")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(3);
    return (data || []).map((p: any) => ({ ...p, profiles: p.profiles?.[0] || null }));
  },
  ["recent-posts"],
  { revalidate: 60 }
);

const getStats = unstable_cache(
  async (): Promise<Stats> => {
    const supabase = createAdminClient();
    const [mediaRes, postsRes, profilesRes] = await Promise.all([
      supabase.from("media").select("id", { count: "exact", head: true }),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);
    return {
      mediaCount: mediaRes.count || 0,
      postsCount: postsRes.count || 0,
      profilesCount: profilesRes.count || 0,
    };
  },
  ["home-stats"],
  { revalidate: 60 }
);

export default async function HomePage() {
  const [recentMedia, recentPosts, stats] = await Promise.all([
    getRecentMedia(),
    getRecentPosts(),
    getStats(),
  ]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto">
          <h1 className="heading-hero mb-4">KodloHUB</h1>
          <p className="text-on-primary-mute text-xl max-w-2xl">
            Все, що створило кодло, в одному місці.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 sm:px-6 pb-16">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      <section className="px-4 sm:px-6 pb-16">
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

          {recentMedia.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-on-primary-mute mb-4">
                брєдік в чат нє пішем — тут поки нічого
              </p>
              <Link href="/upload" className="btn-ghost text-on-primary">
                ЗАВАНТАЖИТИ
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentMedia.map((item) => (
                <Link
                  key={item.id}
                  href="/gallery"
                  className="group rounded-lg overflow-hidden bg-canvas-night-soft border border-hairline-dark hover:border-on-primary-mute transition-colors"
                >
                  {item.file_type === "image" ? (
                    <div className="relative w-full h-48">
                      <Image
                        src={item.file_url}
                        alt={item.caption || "Медіа"}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        loading="lazy"
                      />
                    </div>
                  ) : item.file_type === "video" ? (
                    <div className="w-full h-48 bg-canvas-night flex items-center justify-center">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-mute">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-canvas-night-soft flex items-center justify-center">
                      <p className="micro-cap text-ink-mute">ДОКУМЕНТ</p>
                    </div>
                  )}
                  {item.caption && (
                    <div className="p-3">
                      <p className="caption text-on-primary-mute truncate">{item.caption}</p>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Recent posts */}
      <section className="px-4 sm:px-6 pb-16">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="heading-sub">БЛОГ</h2>
            <Link href="/blog" className="micro-cap text-on-primary-mute hover:text-on-primary transition-opacity">
              ДИВИТИСЬ ВСЕ →
            </Link>
          </div>

          {recentPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-on-primary-mute mb-4">поки писати нічого — напиши перший пост</p>
              <Link href="/upload" className="btn-ghost text-on-primary mt-6 inline-block">
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
                    <div className="flex flex-wrap gap-1 mb-2">
                      {post.tags.slice(0, 3).map((tag: string) => (
                        <span key={tag} className="micro-cap px-2 py-0.5 rounded bg-canvas-cool text-ink-mute text-[10px]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {post.profiles && (
                    <p className="caption text-ink-mute">{post.profiles.display_name}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick links */}
      <section className="px-4 sm:px-6 pb-16">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { href: "/gallery", title: "ГАЛЕРЕЯ", desc: "Фото та відео кодла" },
            { href: "/lore", title: "АРТЕФАКТИ", desc: "Архів артефактів та мемів" },
            { href: "/upload", title: "ЗАВАНТАЖИТИ", desc: "Додай щось своє" },
          ].map((link) => (
            <Link key={link.href} href={link.href} className="card-dark p-6 hover:border-on-primary-mute transition-colors group">
              <h3 className="text-xl sm:text-2xl md:text-4xl font-bold uppercase tracking-wider text-on-primary group-hover:text-on-primary-mute transition-colors">
                {link.title}
              </h3>
              <p className="text-on-primary-mute mt-2">{link.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
