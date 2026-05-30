"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  created_at: string;
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

interface LoreItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  media?: { file_url: string; file_type: string } | null;
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
}: {
  profile: Profile;
  initialPosts: Post[];
  initialMedia: Media[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"posts" | "media" | "liked">("posts");
  const [isOwner, setIsOwner] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [likedMedia, setLikedMedia] = useState<Media[]>([]);
  const [likedLore, setLikedLore] = useState<LoreItem[]>([]);
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
            ? supabase.from("lore_items").select("id, title, description, category, media:media_id(file_url, file_type), created_at").in("id", loreIds)
            : { data: [] as LoreItem[] },
        ]);

        setLikedPosts(postsRes.data || []);
        setLikedMedia(mediaRes.data || []);
        setLikedLore(loreRes.data || []);
        setLikedLoading(false);
      });
  }, [activeTab, profile.id, likedPosts.length, likedMedia.length, likedLore.length, supabase]);

  const tabs = [
    { key: "posts" as const, label: `ПОСТИ (${initialPosts.length})` },
    { key: "media" as const, label: `МЕДІА (${initialMedia.length})` },
    { key: "liked" as const, label: "ЛУБЛЕНІ" },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Profile header */}
        <div className="flex flex-col md:flex-row items-start gap-8 mb-12">
          <div className="w-24 h-24 rounded-full bg-canvas-cool flex items-center justify-center text-ink text-3xl font-bold shrink-0 overflow-hidden relative">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover rounded-full" sizes="96px" />
            ) : (
              profile.display_name?.charAt(0) || "?"
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="heading-sub">{profile.display_name}</h1>
              <span className={`button-cap px-2 py-0.5 rounded border text-[10px] ${roleColors[profile.role] || roleColors.shemetovany}`}>
                {roleLabels[profile.role] || profile.role}
              </span>
              {isOwner && (
                <button
                  onClick={() => router.push(`/profile/${profile.id}/edit`)}
                  className="button-cap px-3 py-1 rounded-full border border-hairline-dark text-ink-mute hover:text-on-primary hover:border-on-primary transition-colors"
                >
                  РЕДАГУВАТИ
                </button>
              )}
            </div>
            <p className="text-on-primary-mute mb-2">@{profile.username}</p>
            {profile.bio && <p className="text-on-primary-mute">{profile.bio}</p>}
            <p className="caption text-ink-mute mt-2">
              Приєднався: {new Date(profile.created_at).toLocaleDateString("uk-UA")}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: "ПОСТІВ", value: initialPosts.length },
            { label: "МЕДІА", value: initialMedia.length },
            { label: "КОМЕНТАРІВ", value: 0 },
            { label: "ДНІВ В КОДЛІ", value: Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000) },
          ].map((stat) => (
            <div key={stat.label} className="card-dark p-4 text-center">
              <p className="heading-sub text-on-primary">{stat.value}</p>
              <p className="micro-cap text-ink-mute mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-hairline-dark pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`button-cap px-4 py-2 transition-opacity ${
                activeTab === tab.key ? "text-on-primary border-b-2 border-on-primary" : "text-ink-mute hover:text-on-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "posts" && (
          initialPosts.length === 0 ? (
            <p className="text-on-primary-mute text-center py-12">Поки немає постів</p>
          ) : (
            <div className="space-y-4">
              {initialPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.id}`}
                  className="card-dark p-6 block hover:border-on-primary-mute transition-colors group"
                >
                  <h3 className="font-bold text-on-primary mb-2 group-hover:text-on-primary-mute transition-colors">{post.title}</h3>
                  <p className="text-on-primary-mute text-sm line-clamp-2">{post.content.slice(0, 200)}</p>
                  <p className="caption text-ink-mute mt-2">{new Date(post.created_at).toLocaleDateString("uk-UA")}</p>
                </Link>
              ))}
            </div>
          )
        )}

        {activeTab === "media" && (
          initialMedia.length === 0 ? (
            <p className="text-on-primary-mute text-center py-12">Поки немає медіа</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {initialMedia.map((item) => (
                <Link
                  key={item.id}
                  href="/gallery"
                  className="rounded-lg overflow-hidden bg-canvas-night-soft border border-hairline-dark hover:border-on-primary-mute transition-colors group"
                >
                  {item.file_type === "image" ? (
                    <div className="relative w-full h-48">
                      <Image src={item.file_url} alt={item.caption || "Медіа"} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" loading="lazy" />
                    </div>
                  ) : item.file_type === "video" ? (
                    <video src={item.file_url} className="w-full h-48 object-cover" preload="none" />
                  ) : (
                    <div className="w-full h-48 bg-canvas-night flex items-center justify-center">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-mute">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                  )}
                  {item.caption && (
                    <div className="p-2">
                      <p className="caption text-on-primary-mute line-clamp-1 text-xs">{item.caption}</p>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )
        )}

        {activeTab === "liked" && (
          likedLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (likedPosts.length === 0 && likedMedia.length === 0 && likedLore.length === 0) ? (
            <p className="text-on-primary-mute text-center py-12">Поки немає лайків</p>
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
                        className="card-dark p-6 block hover:border-on-primary-mute transition-colors group"
                      >
                        <h3 className="font-bold text-on-primary mb-2 group-hover:text-on-primary-mute transition-colors">{post.title}</h3>
                        <p className="text-on-primary-mute text-sm line-clamp-2">{post.content.slice(0, 200)}</p>
                        <p className="caption text-ink-mute mt-2">{new Date(post.created_at).toLocaleDateString("uk-UA")}</p>
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
                        href="/gallery"
                        className="rounded-lg overflow-hidden bg-canvas-night-soft border border-hairline-dark hover:border-on-primary-mute transition-colors group"
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
                        className="card-dark p-6 hover:border-on-primary-mute transition-colors group"
                      >
                        <h3 className="font-bold text-on-primary mb-2 group-hover:text-on-primary-mute transition-colors line-clamp-2">{item.title}</h3>
                        {item.description && (
                          <p className="text-on-primary-mute text-sm line-clamp-2">{item.description.slice(0, 150)}</p>
                        )}
                        <p className="micro-cap text-ink-mute mt-2">{item.category.toUpperCase()}</p>
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
