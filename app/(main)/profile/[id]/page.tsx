"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
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
  caption: string;
  created_at: string;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "media">("posts");
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === params.id) setIsOwner(true);

      let { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", params.id)
        .single();

      // Auto-create profile from auth data if missing
      if (!profileData && user && user.id === params.id) {
        const meta = user.user_metadata || {};
        const newProfile = {
          id: user.id,
          username: meta.email?.split("@")[0] || user.email?.split("@")[0] || `user_${user.id.slice(0, 8)}`,
          display_name: meta.full_name || meta.name || user.email?.split("@")[0] || "Учасник кодла",
          avatar_url: meta.avatar_url || meta.picture || null,
          bio: "",
        };

        const { data: created } = await supabase
          .from("profiles")
          .upsert(newProfile, { onConflict: "id" })
          .select()
          .single();

        profileData = created;
      }

      if (profileData) {
        setProfile(profileData);

        const [{ data: postsData }, { data: mediaData }] = await Promise.all([
          supabase
            .from("posts")
            .select("id, title, content, created_at")
            .eq("author_id", params.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("media")
            .select("id, file_url, file_type, caption, created_at")
            .eq("author_id", params.id)
            .order("created_at", { ascending: false }),
        ]);

        setPosts(postsData || []);
        setMedia(mediaData || []);
      }

      setLoading(false);
    }

    fetchProfile();
  }, [params.id, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="heading-sub text-hairline-dark mb-4">:(</p>
          <p className="text-on-primary-mute">
            брєдік в чат нє пішем — профіль не знайдено
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Profile header */}
        <div className="flex flex-col md:flex-row items-start gap-8 mb-12">
          <div className="w-24 h-24 rounded-full bg-canvas-cool flex items-center justify-center text-ink text-3xl font-bold shrink-0 overflow-hidden">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              profile.display_name?.charAt(0) || "?"
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="heading-sub">{profile.display_name}</h1>
              {profile.role === "admin" && (
                <span className="button-cap px-2 py-1 rounded bg-canvas-cool text-ink">
                  АДМІН
                </span>
              )}
              {isOwner && (
                <button
                  onClick={() => router.push(`/profile/${params.id}/edit`)}
                  className="button-cap px-3 py-1 rounded-full border border-hairline-dark text-ink-mute hover:text-on-primary hover:border-on-primary transition-colors"
                >
                  РЕДАГУВАТИ
                </button>
              )}
            </div>
            <p className="text-on-primary-mute mb-2">@{profile.username}</p>
            {profile.bio && (
              <p className="text-on-primary-mute">{profile.bio}</p>
            )}
            <p className="caption text-ink-mute mt-2">
              Приєднався:{" "}
              {new Date(profile.created_at).toLocaleDateString("uk-UA")}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: "ПОСТІВ", value: posts.length },
            { label: "МЕДІА", value: media.length },
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
          {(["posts", "media"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`button-cap px-4 py-2 transition-opacity ${
                activeTab === tab
                  ? "text-on-primary border-b-2 border-on-primary"
                  : "text-ink-mute hover:text-on-primary"
              }`}
            >
              {tab === "posts" ? `ПОСТИ (${posts.length})` : `МЕДІА (${media.length})`}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "posts" ? (
          posts.length === 0 ? (
            <p className="text-on-primary-mute text-center py-12">
              Поки немає постів
            </p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="card-dark p-6">
                  <h3 className="font-bold text-on-primary mb-2">{post.title}</h3>
                  <p className="text-on-primary-mute text-sm line-clamp-2">
                    {post.content.slice(0, 200)}
                  </p>
                  <p className="caption text-ink-mute mt-2">
                    {new Date(post.created_at).toLocaleDateString("uk-UA")}
                  </p>
                </div>
              ))}
            </div>
          )
        ) : media.length === 0 ? (
          <p className="text-on-primary-mute text-center py-12">
            Поки немає медіа
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {media.map((item) => (
              <div
                key={item.id}
                className="rounded-lg overflow-hidden bg-canvas-night-soft border border-hairline-dark"
              >
                {item.file_type === "image" ? (
                  <img
                    src={item.file_url}
                    alt={item.caption || "Медіа"}
                    className="w-full h-48 object-cover"
                    loading="lazy"
                  />
                ) : item.file_type === "video" ? (
                  <video
                    src={item.file_url}
                    className="w-full h-48 object-cover"
                    preload="metadata"
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
