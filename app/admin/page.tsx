"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

const roleLabels: Record<string, string> = {
  owner: "ГОЛОВНИЙ ПОДРО",
  kodlo: "КОДЛО",
  shemetovany: "ШЕМЕТОВАНИЙ",
};

const roleColors: Record<string, string> = {
  owner: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  kodlo: "bg-on-primary/10 text-on-primary border-on-primary/30",
  shemetovany: "bg-ink-mute/10 text-ink-mute border-ink-mute/30",
};

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });

    setProfiles(data || []);
    setLoading(false);
  }

  async function updateRole(userId: string, newRole: string) {
    setUpdating(userId);

    await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    await fetchProfiles();
    setUpdating(null);
  }

  async function deleteUser(userId: string) {
    if (!confirm("Видалити користувача? Це незворотньо.")) return;

    setUpdating(userId);

    // Delete from auth (admin API)
    await supabase.auth.admin.deleteUser(userId);

    // Delete profile
    await supabase.from("profiles").delete().eq("id", userId);

    await fetchProfiles();
    setUpdating(null);
  }

  const shemetovany = profiles.filter((p) => p.role === "shemetovany");
  const kodlo = profiles.filter((p) => p.role === "kodlo");
  const owners = profiles.filter((p) => p.role === "owner");

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="micro-cap text-ink-mute mb-2">КЕРУВАННЯ</p>
          <h1 className="heading-section mb-4">АДМІН-ПАНЕЛЬ</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          <div className="card-dark p-4 text-center">
            <p className="heading-sub text-on-primary">{owners.length}</p>
            <p className="micro-cap text-ink-mute mt-1">ГОЛОВНИХ ПОДРО</p>
          </div>
          <div className="card-dark p-4 text-center">
            <p className="heading-sub text-on-primary">{kodlo.length}</p>
            <p className="micro-cap text-ink-mute mt-1">КОДЛА</p>
          </div>
          <div className="card-dark p-4 text-center">
            <p className="heading-sub text-yellow-400">{shemetovany.length}</p>
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
                        <img
                          src={profile.avatar_url}
                          alt={profile.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        profile.display_name?.charAt(0) || "?"
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-on-primary">
                        {profile.display_name}
                      </p>
                      <p className="caption text-ink-mute">
                        @{profile.username} ·{" "}
                        {new Date(profile.created_at).toLocaleDateString("uk-UA")}
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
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="card-dark p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-canvas-cool flex items-center justify-center text-ink font-bold overflow-hidden">
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
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-on-primary">
                          {profile.display_name}
                        </p>
                        <span
                          className={`button-cap px-2 py-0.5 rounded border text-[10px] ${roleColors[profile.role] || roleColors.shemetovany}`}
                        >
                          {roleLabels[profile.role] || profile.role}
                        </span>
                      </div>
                      <p className="caption text-ink-mute">
                        @{profile.username} ·{" "}
                        {new Date(profile.created_at).toLocaleDateString("uk-UA")}
                      </p>
                    </div>
                  </div>

                  {profile.role !== "owner" && (
                    <div className="flex items-center gap-2">
                      <select
                        value={profile.role}
                        onChange={(e) => updateRole(profile.id, e.target.value)}
                        disabled={updating === profile.id}
                        className="px-3 py-2 bg-canvas-night-soft border border-hairline-dark rounded text-on-primary text-sm focus:outline-none focus:border-on-primary-mute disabled:opacity-50"
                      >
                        <option value="kodlo">Кодло</option>
                        <option value="shemetovany">Шеметований</option>
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
