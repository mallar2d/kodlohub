"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Avatar from "@/components/ui/Avatar";
import { wikiCategoryIcons } from "@/lib/wiki-icons";

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  created_at: string;
  telegram_id?: string | null;
  telegram_username?: string | null;
  kava_balance_cache?: number;
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

interface UserProject {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  status: string;
  progress_percent: number;
  types: string[] | null;
  created_at: string;
}

interface UserWiki {
  id: string;
  slug: string;
  title: string;
  view_count: number;
  created_at: string;
  wiki_categories?: { name: string; slug: string; icon: string } | null;
}

interface UserLore {
  id: string;
  title: string;
  description: string | null;
  category: string;
  created_at: string;
}

interface LikedItem {
  item_type: string;
  item_id: string;
}

const roleLabels: Record<string, string> = {
  owner: "ГОЛОВНИЙ ПОДРО",
  podrofikovany: "ПОДРОФІКОВАНИЙ",
  kodlo: "КОДЛО",
  shemetovany: "ШЕМЕТОВАНИЙ",
};

const roleColors: Record<string, string> = {
  owner: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  podrofikovany: "bg-purple-500/20 text-purple-400 border-purple-500/50",
  kodlo: "bg-on-primary/10 text-on-primary border-on-primary/30",
  shemetovany: "bg-ink-mute/10 text-ink-mute border-ink-mute/30",
};

export default function ProfileClient({
  profile,
  initialPosts,
  initialMedia,
  initialProjects = [],
  initialWikiArticles = [],
  initialLoreItems = [],
  commentCount = 0,
}: {
  profile: Profile;
  initialPosts: Post[];
  initialMedia: Media[];
  initialProjects?: UserProject[];
  initialWikiArticles?: UserWiki[];
  initialLoreItems?: UserLore[];
  commentCount?: number;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"posts" | "media" | "projects" | "wiki" | "liked">("posts");
  const [isOwner, setIsOwner] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [likedMedia, setLikedMedia] = useState<Media[]>([]);
  const [likedLore, setLikedLore] = useState<UserLore[]>([]);
  const [likedLoading, setLikedLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: any } }) => {
      if (data.user && data.user.id === profile.id) setIsOwner(true);
    });
  }, [profile.id, supabase]);

  useEffect(() => {
    if (activeTab !== "liked") return;
    if (likedPosts.length > 0 || likedMedia.length > 0 || likedLore.length > 0) return;

    setLikedLoading(true);
    supabase
      .from("likes")
      .select("item_type, item_id")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .then(async ({ data: likes }: { data: LikedItem[] | null }) => {
        if (!likes || likes.length === 0) {
          setLikedLoading(false);
          return;
        }

        const postIds = likes.filter((l: LikedItem) => l.item_type === "post").map((l: LikedItem) => l.item_id);
        const mediaIds = likes.filter((l: LikedItem) => l.item_type === "media").map((l: LikedItem) => l.item_id);
        const loreIds = likes.filter((l: LikedItem) => l.item_type === "lore").map((l: LikedItem) => l.item_id);

        const [postsRes, mediaRes, loreRes] = await Promise.all([
          postIds.length > 0
            ? supabase.from("posts").select("id, title, content, created_at").in("id", postIds)
            : { data: [] as Post[] },
          mediaIds.length > 0
            ? supabase.from("media").select("id, file_url, file_type, caption, created_at").in("id", mediaIds)
            : { data: [] as Media[] },
          loreIds.length > 0
            ? supabase.from("lore_items").select("id, title, description, category, created_at").in("id", loreIds)
            : { data: [] as UserLore[] },
        ]);

        setLikedPosts(postsRes.data || []);
        setLikedMedia(mediaRes.data || []);
        setLikedLore((loreRes.data || []) as UserLore[]);
        setLikedLoading(false);
      });
  }, [activeTab, profile.id, likedPosts.length, likedMedia.length, likedLore.length, supabase]);

  const tabs = [
    { key: "posts" as const, label: `ПОСТИ (${initialPosts.length})` },
    { key: "media" as const, label: `МЕДІА (${initialMedia.length})` },
    { key: "projects" as const, label: `ПРОЄКТИ (${initialProjects.length})` },
    { key: "wiki" as const, label: `ВІКІ ТА ЛОР (${initialWikiArticles.length + initialLoreItems.length})` },
    { key: "liked" as const, label: "ЛУБЛЕНІ" },
  ];

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Profile header */}
        <div className="card-dark p-6 sm:p-8 rounded-2xl mb-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar src={profile.avatar_url} displayName={profile.display_name} size={96} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="heading-sub !text-3xl text-on-primary">{profile.display_name}</h1>
                <span className={`button-cap px-2.5 py-0.5 rounded-full border text-[11px] font-mono ${roleColors[profile.role] || roleColors.shemetovany}`}>
                  {roleLabels[profile.role] || profile.role}
                </span>
                {isOwner && (
                  <button
                    onClick={() => router.push(`/profile/${profile.id}/edit`)}
                    className="button-cap px-3 py-1 rounded-full border border-hairline-dark text-xs text-on-primary-mute hover:text-on-primary hover:border-on-primary transition-colors cursor-pointer"
                  >
                    РЕДАГУВАТИ ПРОФІЛЬ
                  </button>
                )}
              </div>
              <p className="text-on-primary-mute text-sm mb-2 font-mono">@{profile.username}</p>
              {profile.bio && <p className="text-on-primary-mute text-sm leading-relaxed max-w-2xl">{profile.bio}</p>}
              
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {profile.telegram_id ? (
                  <Link
                    href="/tools/kava"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-hairline-dark bg-canvas-night-soft text-xs font-mono text-on-primary hover:border-on-primary transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    <span>@{profile.telegram_username || profile.telegram_id}</span>
                    <span>•</span>
                    <span className="font-bold">{profile.kava_balance_cache || 0} KAVA</span>
                  </Link>
                ) : isOwner ? (
                  <Link
                    href="/tools/kava"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-hairline-dark text-xs font-mono text-on-primary-mute hover:text-on-primary hover:border-on-primary transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    <span>Підключити Telegram (@podroid_bot)</span>
                  </Link>
                ) : null}
              </div>

              <p className="caption text-ink-mute mt-3 text-xs">
                Учасник кодла з {new Date(profile.created_at).toLocaleDateString("uk-UA")}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-10">
          {[
            { label: "ПОСТІВ", value: initialPosts.length },
            { label: "МЕДІА", value: initialMedia.length },
            { label: "ПРОЄКТІВ", value: initialProjects.length },
            { label: "СТАТЕЙ ВІКІ", value: initialWikiArticles.length },
            { label: "КОМЕНТАРІВ", value: commentCount },
          ].map((stat) => (
            <div key={stat.label} className="card-dark p-4 text-center rounded-xl">
              <p className="heading-sub !text-2xl text-on-primary font-mono">{stat.value}</p>
              <p className="micro-cap text-ink-mute mt-1 text-[10px]">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs Bar */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 border-b border-hairline-dark">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`button-cap px-4 py-2.5 rounded-lg text-xs transition-colors shrink-0 cursor-pointer ${
                activeTab === tab.key
                  ? "bg-on-primary text-ink font-bold"
                  : "text-on-primary-mute hover:text-on-primary hover:bg-canvas-night-soft"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Posts */}
        {activeTab === "posts" && (
          initialPosts.length === 0 ? (
            <div className="text-center py-16 border border-hairline-dark rounded-xl bg-canvas-night-soft/40">
              <p className="text-on-primary-mute">Автор ще не опублікував жодного допису</p>
            </div>
          ) : (
            <div className="space-y-4">
              {initialPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.id}`}
                  className="card-dark p-6 block hover:border-on-primary-mute transition-colors group rounded-xl"
                >
                  <h3 className="font-bold text-on-primary text-lg mb-2 group-hover:text-cyan-400 transition-colors">{post.title}</h3>
                  <p className="text-on-primary-mute text-sm line-clamp-2 leading-relaxed">{post.content.slice(0, 200)}</p>
                  <p className="caption text-ink-mute mt-3 text-xs font-mono">{new Date(post.created_at).toLocaleDateString("uk-UA")}</p>
                </Link>
              ))}
            </div>
          )
        )}

        {/* Tab 2: Media */}
        {activeTab === "media" && (
          initialMedia.length === 0 ? (
            <div className="text-center py-16 border border-hairline-dark rounded-xl bg-canvas-night-soft/40">
              <p className="text-on-primary-mute">Автор ще не завантажив жодного медіафайлу</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {initialMedia.map((item) => (
                <Link
                  key={item.id}
                  href={`/gallery/${item.id}`}
                  className="rounded-xl overflow-hidden bg-canvas-night-soft border border-hairline-dark hover:border-on-primary-mute transition-colors group block"
                >
                  {item.file_type === "image" ? (
                    <div className="relative w-full h-48">
                      <Image src={item.file_url} alt={item.caption || "Медіа"} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" loading="lazy" />
                    </div>
                  ) : item.file_type === "video" ? (
                    <div className="w-full h-48 bg-canvas-night flex items-center justify-center">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-mute">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-canvas-night flex items-center justify-center">
                      <p className="micro-cap text-ink-mute">ДОКУМЕНТ</p>
                    </div>
                  )}
                  {item.caption && (
                    <div className="p-3 border-t border-hairline-dark">
                      <p className="caption text-on-primary-mute line-clamp-1 text-xs">{item.caption}</p>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )
        )}

        {/* Tab 3: Projects */}
        {activeTab === "projects" && (
          initialProjects.length === 0 ? (
            <div className="text-center py-16 border border-hairline-dark rounded-xl bg-canvas-night-soft/40">
              <p className="text-on-primary-mute">Автор ще не створив жодного публічного проєкту</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {initialProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.slug}`}
                  className="card-dark p-6 hover:border-on-primary-mute transition-colors group flex flex-col justify-between rounded-xl"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="micro-cap px-2 py-0.5 rounded border border-hairline-dark text-[10px] uppercase font-mono text-ink-mute">
                        {project.status}
                      </span>
                      <span className="text-xs text-cyan-400 font-mono">{project.progress_percent}% готово</span>
                    </div>
                    <h3 className="text-xl font-bold uppercase text-on-primary group-hover:text-cyan-400 transition-colors mb-2">
                      {project.title}
                    </h3>
                    <p className="text-on-primary-mute text-sm line-clamp-2 leading-relaxed">
                      {project.short_description}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-hairline-dark flex items-center justify-between text-xs text-ink-mute">
                    <span>Відкрити проєкт</span>
                    <span className="group-hover:text-on-primary transition-colors">→</span>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* Tab 4: Wiki & Lore */}
        {activeTab === "wiki" && (
          (initialWikiArticles.length === 0 && initialLoreItems.length === 0) ? (
            <div className="text-center py-16 border border-hairline-dark rounded-xl bg-canvas-night-soft/40">
              <p className="text-on-primary-mute">Немає доданих статей або артефактів</p>
            </div>
          ) : (
            <div className="space-y-8">
              {initialWikiArticles.length > 0 && (
                <div>
                  <p className="micro-cap text-ink-mute mb-4">СТАТТІ КОДЛОПЕДІЇ ({initialWikiArticles.length})</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {initialWikiArticles.map((article) => (
                      <Link
                        key={article.id}
                        href={`/wiki/${article.wiki_categories?.slug || "general"}/${article.slug}`}
                        className="card-dark p-6 hover:border-on-primary-mute transition-colors group rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{wikiCategoryIcons[article.wiki_categories?.slug || "general"] || wikiCategoryIcons.general}</span>
                          <div>
                            <h4 className="font-bold text-on-primary group-hover:text-cyan-400 transition-colors">{article.title}</h4>
                            <p className="text-xs text-ink-mute">{article.wiki_categories?.name || "Кодлопедія"} · {article.view_count} переглядів</p>
                          </div>
                        </div>
                        <span className="text-ink-mute group-hover:text-on-primary transition-colors">→</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {initialLoreItems.length > 0 && (
                <div>
                  <p className="micro-cap text-ink-mute mb-4">АРТЕФАКТИ ТА ЛОР ({initialLoreItems.length})</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {initialLoreItems.map((item) => (
                      <Link
                        key={item.id}
                        href={`/lore/${item.id}`}
                        className="card-dark p-6 hover:border-on-primary-mute transition-colors group rounded-xl"
                      >
                        <span className="micro-cap text-[10px] text-ink-mute uppercase font-mono block mb-1">{item.category}</span>
                        <h4 className="font-bold text-on-primary group-hover:text-cyan-400 transition-colors mb-1">{item.title}</h4>
                        {item.description && (
                          <p className="text-xs text-on-primary-mute line-clamp-2 leading-relaxed">{item.description}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* Tab 5: Liked */}
        {activeTab === "liked" && (
          likedLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (likedPosts.length === 0 && likedMedia.length === 0 && likedLore.length === 0) ? (
            <div className="text-center py-16 border border-hairline-dark rounded-xl bg-canvas-night-soft/40">
              <p className="text-on-primary-mute">Поки немає збережених або вподобаних матеріалів</p>
            </div>
          ) : (
            <div className="space-y-8">
              {likedPosts.length > 0 && (
                <div>
                  <p className="micro-cap text-ink-mute mb-4">ПОСТИ</p>
                  <div className="space-y-4">
                    {likedPosts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/blog/${post.id}`}
                        className="card-dark p-6 block hover:border-on-primary-mute transition-colors group rounded-xl"
                      >
                        <h3 className="font-bold text-on-primary mb-2 group-hover:text-cyan-400 transition-colors">{post.title}</h3>
                        <p className="text-on-primary-mute text-sm line-clamp-2 leading-relaxed">{post.content.slice(0, 200)}</p>
                        <p className="caption text-ink-mute mt-2 text-xs font-mono">{new Date(post.created_at).toLocaleDateString("uk-UA")}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {likedMedia.length > 0 && (
                <div>
                  <p className="micro-cap text-ink-mute mb-4">МЕДІА</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {likedMedia.map((item) => (
                      <Link
                        key={item.id}
                        href={`/gallery/${item.id}`}
                        className="rounded-xl overflow-hidden bg-canvas-night-soft border border-hairline-dark hover:border-on-primary-mute transition-colors group block"
                      >
                        {item.file_type === "image" ? (
                          <div className="relative w-full h-48">
                            <Image src={item.file_url} alt={item.caption || "Медіа"} fill className="object-cover" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" loading="lazy" />
                          </div>
                        ) : (
                          <div className="w-full h-48 bg-canvas-night flex items-center justify-center">
                            <p className="micro-cap text-ink-mute">ВІДЕО</p>
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {likedLore.length > 0 && (
                <div>
                  <p className="micro-cap text-ink-mute mb-4">АРТЕФАКТИ</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {likedLore.map((item) => (
                      <Link
                        key={item.id}
                        href={`/lore/${item.id}`}
                        className="card-dark p-6 hover:border-on-primary-mute transition-colors group rounded-xl"
                      >
                        <span className="micro-cap text-[10px] text-ink-mute uppercase font-mono block mb-1">{item.category}</span>
                        <h3 className="font-bold text-on-primary mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">{item.title}</h3>
                        {item.description && (
                          <p className="text-on-primary-mute text-sm line-clamp-2 leading-relaxed">{item.description.slice(0, 150)}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

