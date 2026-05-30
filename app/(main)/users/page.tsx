"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

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

export default function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function fetchProfiles() {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });

      setProfiles(data || []);
      setLoading(false);
    }

    fetchProfiles();
  }, [supabase]);

  const filtered = profiles.filter((p) =>
    p.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-12">
          <p className="micro-cap text-ink-mute mb-2">СПІЛЬНОТА</p>
          <h1 className="heading-section mb-4">УЧАСНИКИ КОДЛА</h1>
        </div>

        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="ШУКАТИ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute"
          />
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map((profile) => (
              <Link
                key={profile.id}
                href={`/profile/${profile.id}`}
                className="card-dark p-6 hover:border-on-primary-mute transition-colors group"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 rounded-full bg-canvas-cool flex items-center justify-center text-ink text-xl font-bold overflow-hidden shrink-0">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (profile.display_name?.charAt(0) || "?")}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-on-primary group-hover:text-on-primary-mute transition-colors truncate">{profile.display_name}</p>
                    <p className="caption text-ink-mute truncate">@{profile.username}</p>
                  </div>
                </div>
                <span className={`button-cap px-2 py-0.5 rounded border text-[10px] ${roleColors[profile.role] || roleColors.shemetovany}`}>
                  {roleLabels[profile.role] || profile.role}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
