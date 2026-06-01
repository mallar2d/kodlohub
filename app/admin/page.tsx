"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import Avatar from "@/components/ui/Avatar";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

interface MediaItem {
  id: string;
  author_id: string;
  file_size: number | null;
}

interface PendingPost {
  id: string;
  title: string;
  content: string;
  author_id: string;
  status: string;
  created_at: string;
  profiles?: { display_name: string; username: string; avatar_url: string | null };
}

interface JoinRequest {
  id: string;
  user_id: string;
  status: string;
  message: string;
  created_at: string;
  profiles?: { display_name: string; username: string; avatar_url: string | null };
}

interface AdminComment {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  source: "post" | "media";
  source_id: string;
  profiles?: { display_name: string; username: string };
}

interface StorageInfo {
  totalBytes: number;
  byUser: Record<string, { bytes: number; count: number }>;
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Б";
  const k = 1024;
  const sizes = ["Б", "КБ", "МБ", "ГБ"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [storage, setStorage] = useState<StorageInfo>({ totalBytes: 0, byUser: {} });
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }: { data: { user: any } }) => {
      setCurrentUser(data.user);
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        setCurrentRole(profile?.role || null);
      }
    });
    fetchData();
  }, []);

  async function fetchData() {
    const [profilesRes, mediaRes, pendingRes, joinRes, postCommentsRes, mediaCommentsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: true }),
      supabase.from("media").select("id, author_id, file_size"),
      supabase.from("posts").select("*, profiles(display_name, username, avatar_url)").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("join_requests").select("*, profiles(display_name, username, avatar_url)").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("comments").select("*, profiles(display_name, username)").order("created_at", { ascending: false }).limit(50),
      supabase.from("media_comments").select("*, profiles(display_name, username)").order("created_at", { ascending: false }).limit(50),
    ]);

    setProfiles(profilesRes.data || []);
    setPendingPosts(pendingRes.data || []);
    setJoinRequests(joinRes.data || []);

    const allComments: AdminComment[] = [
      ...(postCommentsRes.data || []).map((c: any) => ({
        id: c.id,
        content: c.content,
        author_id: c.author_id,
        created_at: c.created_at,
        source: "post" as const,
        source_id: c.post_id,
        profiles: c.profiles?.[0] || null,
      })),
      ...(mediaCommentsRes.data || []).map((c: any) => ({
        id: c.id,
        content: c.content,
        author_id: c.author_id,
        created_at: c.created_at,
        source: "media" as const,
        source_id: c.media_id,
        profiles: c.profiles?.[0] || null,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setComments(allComments);

    // Calculate storage
    const mediaItems = mediaRes.data || [];
    let totalBytes = 0;
    const byUser: Record<string, { bytes: number; count: number }> = {};

    for (const item of mediaItems) {
      const size = item.file_size || 0;
      totalBytes += size;

      if (!byUser[item.author_id]) {
        byUser[item.author_id] = { bytes: 0, count: 0 };
      }
      byUser[item.author_id].bytes += size;
      byUser[item.author_id].count += 1;
    }

    setStorage({ totalBytes, byUser });
    setLoading(false);
  }

  async function updateRole(userId: string, newRole: string) {
    // Prevent self-role change
    if (userId === currentUser?.id) {
      toast("Не можна змінювати свою роль!", "error");
      return;
    }

    setUpdating(userId);

    // Get old role for notification
    const { data: oldProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    await supabase.from("profiles").update({ role: newRole }).eq("id", userId);

    // Send notification
    const roleLabels: Record<string, string> = {
      owner: "Головний Подро",
      podrofikovany: "Подрофікований",
      kodlo: "Кодло",
      shemetovany: "Шеметований",
    };

    await supabase.from("notifications").insert({
      user_id: userId,
      type: "role_changed",
      title: "Змінено роль",
      message: `Твою роль змінено на "${roleLabels[newRole] || newRole}"`,
      link: `/profile/${userId}`,
    });

    await fetchData();
    setUpdating(null);
  }

  async function deleteUser(userId: string) {
    if (!confirm("Видалити користувача? Це незворотньо.")) return;
    setUpdating(userId);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Не вдалося видалити користувача", "error");
      } else {
        toast("Користувача видалено", "success");
      }
    } catch {
      toast("Помилка з'єднання з сервером", "error");
    }
    await fetchData();
    setUpdating(null);
  }

  async function approvePost(postId: string) {
    setUpdating(postId);
    const { data: post } = await supabase.from("posts").select("author_id, title").eq("id", postId).single();

    await supabase.from("posts").update({ status: "approved" }).eq("id", postId);

    if (post) {
      await supabase.from("notifications").insert({
        user_id: post.author_id,
        type: "post_approved",
        title: "Пост апрувнуто",
        message: `Твій пост "${post.title}" опубліковано!`,
        link: `/blog/${postId}`,
      });
    }

    await fetchData();
    setUpdating(null);
  }

  async function rejectPost(postId: string) {
    setUpdating(postId);
    const { data: post } = await supabase.from("posts").select("author_id, title").eq("id", postId).single();

    await supabase.from("posts").update({ status: "rejected" }).eq("id", postId);

    if (post) {
      await supabase.from("notifications").insert({
        user_id: post.author_id,
        type: "post_rejected",
        title: "Пост відхилено",
        message: `Твій пост "${post.title}" не пройшов модерацію.`,
      });
    }

    await fetchData();
    setUpdating(null);
  }

  async function bulkApprovePosts() {
    if (selectedPosts.size === 0) return;
    setUpdating("bulk");

    for (const postId of selectedPosts) {
      const { data: post } = await supabase.from("posts").select("author_id, title").eq("id", postId).single();
      await supabase.from("posts").update({ status: "approved" }).eq("id", postId);
      if (post) {
        await supabase.from("notifications").insert({
          user_id: post.author_id,
          type: "post_approved",
          title: "Пост апрувнуто",
          message: `Твій пост "${post.title}" опубліковано!`,
          link: `/blog/${postId}`,
        });
      }
    }

    toast(`Апрувнуто ${selectedPosts.size} пост(ів)`, "success");
    setSelectedPosts(new Set());
    await fetchData();
    setUpdating(null);
  }

  async function bulkRejectPosts() {
    if (selectedPosts.size === 0) return;
    if (!confirm(`Відхилити ${selectedPosts.size} пост(ів)?`)) return;
    setUpdating("bulk");

    for (const postId of selectedPosts) {
      const { data: post } = await supabase.from("posts").select("author_id, title").eq("id", postId).single();
      await supabase.from("posts").update({ status: "rejected" }).eq("id", postId);
      if (post) {
        await supabase.from("notifications").insert({
          user_id: post.author_id,
          type: "post_rejected",
          title: "Пост відхилено",
          message: `Твій пост "${post.title}" не пройшов модерацію.`,
        });
      }
    }

    toast(`Відхилено ${selectedPosts.size} пост(ів)`, "info");
    setSelectedPosts(new Set());
    await fetchData();
    setUpdating(null);
  }

  function togglePostSelection(postId: string) {
    setSelectedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  function toggleAllPosts() {
    if (selectedPosts.size === pendingPosts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(pendingPosts.map((p) => p.id)));
    }
  }

  async function deleteComment(comment: AdminComment) {
    if (!confirm("Видалити коментар?")) return;

    const table = comment.source === "post" ? "comments" : "media_comments";
    await supabase.from(table).delete().eq("id", comment.id);
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
    toast("Коментар видалено", "success");
  }

  async function approveJoinRequest(requestId: string, userId: string) {
    setUpdating(requestId);

    await supabase.from("join_requests").update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: currentUser?.id,
    }).eq("id", requestId);

    await supabase.from("profiles").update({ role: "kodlo" }).eq("id", userId);

    await supabase.from("notifications").insert({
      user_id: userId,
      type: "role_changed",
      title: "Заявку на Кодло схвалено!",
      message: "Вітаємо! Тепер ти — Кодло. Маєш повні права.",
      link: `/profile/${userId}`,
    });

    await fetchData();
    setUpdating(null);
  }

  async function rejectJoinRequest(requestId: string, userId: string) {
    setUpdating(requestId);

    await supabase.from("join_requests").update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: currentUser?.id,
    }).eq("id", requestId);

    await supabase.from("notifications").insert({
      user_id: userId,
      type: "role_changed",
      title: "Заявку на Кодло відхилено",
      message: "Наразі тобі відмовлено. Спробуй пізніше.",
    });

    await fetchData();
    setUpdating(null);
  }

  const isOwner = currentRole === "owner";
  const isPodrofikovany = currentRole === "podrofikovany";

  function canEditUser(targetRole: string): boolean {
    if (isOwner) return true;
    if (isPodrofikovany) return targetRole === "kodlo" || targetRole === "shemetovany";
    return false;
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-12">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-10 w-64" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const shemetovany = profiles.filter((p) => p.role === "shemetovany");
  const podrofikovany = profiles.filter((p) => p.role === "podrofikovany");
  const kodlo = profiles.filter((p) => p.role === "kodlo");
  const owners = profiles.filter((p) => p.role === "owner");

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="micro-cap text-ink-mute mb-2">КЕРУВАННЯ</p>
            <h1 className="heading-section mb-4">АДМІН-ПАНЕЛЬ</h1>
            <p className="text-on-primary-mute">
              {isOwner ? "Повний доступ" : "Доступ до керування користувачами"}
            </p>
          </div>
          <a
            href="/admin/dashboard"
            className="btn-ghost text-on-primary w-fit"
          >
            ДАШБОРД →
          </a>
        </div>

        {/* Storage stats */}
        <div className="mb-12">
          <h2 className="heading-sub mb-6">СХОВИЩЕ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card-dark p-6">
              <p className="micro-cap text-ink-mute mb-2">ЗАГАЛЬНИЙ ОБ'ЄМ</p>
              <p className="heading-sub text-on-primary">{formatBytes(storage.totalBytes)}</p>
              <div className="mt-3 h-2 bg-canvas-night-soft rounded-full overflow-hidden">
                <div
                  className="h-full bg-on-primary rounded-full transition-all"
                  style={{ width: `${Math.min((storage.totalBytes / (10 * 1024 * 1024 * 1024)) * 100, 100)}%` }}
                />
              </div>
              <p className="caption text-ink-mute mt-1">з 10 ГБ (R2 безкоштовний план)</p>
            </div>
            <div className="card-dark p-6">
              <p className="micro-cap text-ink-mute mb-2">ЗАВАНТАЖЕНЬ</p>
              <p className="heading-sub text-on-primary">
                {Object.values(storage.byUser).reduce((a, b) => a + b.count, 0)}
              </p>
              <p className="caption text-ink-mute mt-1">файлів загалом</p>
            </div>
          </div>

          {/* Per-user storage */}
          {Object.keys(storage.byUser).length > 0 && (
            <div className="mt-4 card-dark p-6">
              <p className="micro-cap text-ink-mute mb-4">ЗАЙНЯТО ПО КОРИСТУВАЧАХ</p>
              <div className="space-y-3">
                {Object.entries(storage.byUser)
                  .sort(([, a], [, b]) => b.bytes - a.bytes)
                  .map(([userId, info]) => {
                    const profile = profiles.find((p) => p.id === userId);
                    return (
                      <div key={userId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar src={profile?.avatar_url} displayName={profile?.display_name} size={24} />
                          <span className="text-on-primary text-sm">
                            {profile?.display_name || userId.slice(0, 8)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="caption text-ink-mute">{info.count} файлів</span>
                          <span className="button-cap text-on-primary">{formatBytes(info.bytes)}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Role stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="card-dark p-4 text-center">
            <p className="heading-sub text-yellow-400">{owners.length}</p>
            <p className="micro-cap text-ink-mute mt-1">ГОЛОВНИХ ПОДРО</p>
          </div>
          <div className="card-dark p-4 text-center">
            <p className="heading-sub text-purple-400">{podrofikovany.length}</p>
            <p className="micro-cap text-ink-mute mt-1">ПОДРОФІКОВАНИХ</p>
          </div>
          <div className="card-dark p-4 text-center">
            <p className="heading-sub text-on-primary">{kodlo.length}</p>
            <p className="micro-cap text-ink-mute mt-1">КОДЛА</p>
          </div>
          <div className="card-dark p-4 text-center">
            <p className="heading-sub text-ink-mute">{shemetovany.length}</p>
            <p className="micro-cap text-ink-mute mt-1">ШЕМЕТОВАНИХ</p>
          </div>
        </div>

        {/* Pending posts */}
        {pendingPosts.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="heading-sub text-yellow-400">
                ПОСТИ НА РОЗГЛЯДІ ({pendingPosts.length})
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleAllPosts}
                  className="button-cap px-3 py-1 rounded border border-hairline-dark text-ink-mute hover:text-on-primary text-xs"
                >
                  {selectedPosts.size === pendingPosts.length ? "ЗНЯТИ ВСІ" : "ВИБРАТИ ВСІ"}
                </button>
                {selectedPosts.size > 0 && (
                  <>
                    <button
                      onClick={bulkApprovePosts}
                      disabled={updating === "bulk"}
                      className="button-cap px-3 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/50 text-xs disabled:opacity-50"
                    >
                      АПРУВНУТИ ({selectedPosts.size})
                    </button>
                    <button
                      onClick={bulkRejectPosts}
                      disabled={updating === "bulk"}
                      className="button-cap px-3 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/50 text-xs disabled:opacity-50"
                    >
                      ВІДХИЛИТИ ({selectedPosts.size})
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-4">
              {pendingPosts.map((post) => (
                <div key={post.id} className={`card-dark p-6 border-yellow-500/30 ${selectedPosts.has(post.id) ? "ring-1 ring-on-primary/30" : ""}`}>
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedPosts.has(post.id)}
                        onChange={() => togglePostSelection(post.id)}
                        className="mt-1 accent-on-primary"
                      />
                      <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="button-cap px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 text-[10px]">
                          НА РОЗГЛЯДІ
                        </span>
                        <span className="caption text-ink-mute">
                          {new Date(post.created_at).toLocaleString("uk-UA")}
                        </span>
                      </div>
                      <h3 className="font-bold text-on-primary mb-1">{post.title}</h3>
                      <p className="text-on-primary-mute text-sm line-clamp-3 mb-2">
                        {post.content.slice(0, 200)}...
                      </p>
                      <p className="caption text-ink-mute">
                        Автор: {post.profiles?.display_name || "?"}
                      </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => approvePost(post.id)}
                        disabled={updating === post.id}
                        className="button-cap px-4 py-2 rounded-full bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                      >
                        АПРУВНУТИ
                      </button>
                      <button
                        onClick={() => rejectPost(post.id)}
                        disabled={updating === post.id}
                        className="button-cap px-4 py-2 rounded-full bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        ВІДХИЛИТИ
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Join requests */}
        {joinRequests.length > 0 && (
          <div className="mb-12">
            <h2 className="heading-sub mb-6 text-purple-400">
              ЗАЯВКИ НА КОДЛО ({joinRequests.length})
            </h2>
            <div className="space-y-4">
              {joinRequests.map((req) => (
                <div key={req.id} className="card-dark p-6 border-purple-500/30">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="button-cap px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/50 text-[10px]">
                          ЗАЯВКА НА КОДЛО
                        </span>
                        <span className="caption text-ink-mute">
                          {new Date(req.created_at).toLocaleString("uk-UA")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar src={req.profiles?.avatar_url} displayName={req.profiles?.display_name} size={24} />
                        <p className="font-bold text-on-primary">{req.profiles?.display_name || "?"}</p>
                      </div>
                      {req.message && (
                        <p className="text-on-primary-mute text-sm italic">"{req.message}"</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => approveJoinRequest(req.id, req.user_id)}
                        disabled={updating === req.id}
                        className="button-cap px-4 py-2 rounded-full bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                      >
                        СХВАЛИТИ
                      </button>
                      <button
                        onClick={() => rejectJoinRequest(req.id, req.user_id)}
                        disabled={updating === req.id}
                        className="button-cap px-4 py-2 rounded-full bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        ВІДХИЛИТИ
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shemetovany — needs approval */}
        {shemetovany.length > 0 && (
          <div className="mb-12">
            <h2 className="heading-sub mb-6 text-yellow-400">
              ЧЕКАЮТЬ НА АПРУВ ({shemetovany.length})
            </h2>
            <div className="space-y-3">
              {shemetovany.map((profile) => (
                <div
                  key={profile.id}
                  className="card-dark p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-yellow-500/30"
                >
                  <div className="flex items-center gap-4">
                    <Avatar src={profile.avatar_url} displayName={profile.display_name} size={40} />
                    <div>
                      <p className="font-bold text-on-primary">{profile.display_name}</p>
                      <p className="caption text-ink-mute">
                        @{profile.username} · {new Date(profile.created_at).toLocaleDateString("uk-UA")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateRole(profile.id, "kodlo")}
                      disabled={updating === profile.id}
                      className="button-cap px-4 py-2 rounded-full bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                    >
                      ЗРОБИТИ КОДЛОМ
                    </button>
                    <button
                      onClick={() => deleteUser(profile.id)}
                      disabled={updating === profile.id}
                      className="button-cap px-4 py-2 rounded-full bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                    >
                      ВИДАЛИТИ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All users */}
        {/* Comment moderation */}
        {comments.length > 0 && (
          <div className="mb-12">
            <h2 className="heading-sub mb-6">КОМЕНТАРІ ({comments.length})</h2>
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="card-dark p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="button-cap px-2 py-0.5 rounded text-[10px] border border-hairline-dark text-ink-mute">
                          {comment.source === "post" ? "БЛОГ" : "МЕДІА"}
                        </span>
                        <span className="text-xs font-bold text-on-primary">
                          {comment.profiles?.display_name || "?"}
                        </span>
                        <span className="text-[10px] text-ink-mute">
                          {new Date(comment.created_at).toLocaleString("uk-UA")}
                        </span>
                      </div>
                      <p className="text-sm text-on-primary-mute line-clamp-2">{comment.content}</p>
                    </div>
                    <button
                      onClick={() => deleteComment(comment)}
                      className="button-cap px-2 py-1 rounded text-red-400 hover:bg-red-500/10 text-xs shrink-0"
                    >
                      ВИДАЛИТИ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="heading-sub mb-6">ВСІ КОРИСТУВАЧІ ({profiles.length})</h2>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile) => {
                const editable = canEditUser(profile.role) && profile.id !== currentUser?.id;
                const userStorage = storage.byUser[profile.id];

                return (
                  <div
                    key={profile.id}
                    className="card-dark p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar src={profile.avatar_url} displayName={profile.display_name} size={40} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-on-primary">{profile.display_name}</p>
                          <span className={`button-cap px-2 py-0.5 rounded border text-[10px] ${roleColors[profile.role] || roleColors.shemetovany}`}>
                            {roleLabels[profile.role] || profile.role}
                          </span>
                        </div>
                        <p className="caption text-ink-mute">
                          @{profile.username} · {new Date(profile.created_at).toLocaleDateString("uk-UA")}
                          {userStorage && ` · ${formatBytes(userStorage.bytes)} (${userStorage.count} файлів)`}
                        </p>
                      </div>
                    </div>

                    {editable && (
                      <div className="flex items-center gap-2">
                        <select
                          value={profile.role}
                          onChange={(e) => updateRole(profile.id, e.target.value)}
                          disabled={updating === profile.id}
                          className="px-3 py-2 bg-canvas-night-soft border border-hairline-dark rounded text-on-primary text-sm focus:outline-none focus:border-on-primary-mute disabled:opacity-50"
                        >
                          <option value="kodlo">Кодло</option>
                          <option value="shemetovany">Шеметований</option>
                          {isOwner && <option value="podrofikovany">Подрофікований</option>}
                        </select>
                        <button
                          onClick={() => deleteUser(profile.id)}
                          disabled={updating === profile.id}
                          className="button-cap px-3 py-2 rounded bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
