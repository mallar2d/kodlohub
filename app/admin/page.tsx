"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
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
    const [profilesRes, mediaRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: true }),
      supabase.from("media").select("id, author_id, file_size"),
    ]);

    setProfiles(profilesRes.data || []);

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
    setUpdating(userId);
    await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    await fetchData();
    setUpdating(null);
  }

  async function deleteUser(userId: string) {
    if (!confirm("Видалити користувача? Це незворотньо.")) return;
    setUpdating(userId);
    await supabase.auth.admin.deleteUser(userId);
    await supabase.from("profiles").delete().eq("id", userId);
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

  const shemetovany = profiles.filter((p) => p.role === "shemetovany");
  const podrofikovany = profiles.filter((p) => p.role === "podrofikovany");
  const kodlo = profiles.filter((p) => p.role === "kodlo");
  const owners = profiles.filter((p) => p.role === "owner");

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="micro-cap text-ink-mute mb-2">КЕРУВАННЯ</p>
          <h1 className="heading-section mb-4">АДМІН-ПАНЕЛЬ</h1>
          <p className="text-on-primary-mute">
            {isOwner ? "Повний доступ" : "Доступ до керування користувачами"}
          </p>
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
                          <div className="w-6 h-6 rounded-full bg-canvas-cool flex items-center justify-center text-ink text-xs font-bold overflow-hidden">
                            {profile?.avatar_url ? (
                              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              profile?.display_name?.charAt(0) || "?"
                            )}
                          </div>
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
                  className="card-dark p-4 flex items-center justify-between border-yellow-500/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-canvas-cool flex items-center justify-center text-ink font-bold overflow-hidden">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        profile.display_name?.charAt(0) || "?"
                      )}
                    </div>
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
        <div>
          <h2 className="heading-sub mb-6">ВСІ КОРИСТУВАЧІ ({profiles.length})</h2>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile) => {
                const editable = canEditUser(profile.role);
                const userStorage = storage.byUser[profile.id];

                return (
                  <div
                    key={profile.id}
                    className="card-dark p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-canvas-cool flex items-center justify-center text-ink font-bold overflow-hidden">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          profile.display_name?.charAt(0) || "?"
                        )}
                      </div>
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
