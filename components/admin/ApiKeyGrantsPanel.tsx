"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import Avatar from "@/components/ui/Avatar";

interface GrantRow {
  user_id: string;
  allowed_scopes: string[];
  max_rate_limit_per_minute: number;
  allow_admin_scope: boolean;
  note: string;
  created_at: string;
  profiles?: { display_name: string; username: string; avatar_url: string | null } | null;
}

interface ProfileOption {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

export default function ApiKeyGrantsPanel({ profiles }: { profiles: ProfileOption[] }) {
  const { toast } = useToast();
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read"]);
  const [maxRate, setMaxRate] = useState(60);
  const [allowAdmin, setAllowAdmin] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadGrants() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/api-key-grants/list");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setGrants(data.grants || []);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Помилка", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGrants();
  }, []);

  function toggleScope(scope: string) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  async function grantAccess() {
    if (!userId) {
      toast("Обери користувача", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/api-key-grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          allowed_scopes: scopes,
          max_rate_limit_per_minute: maxRate,
          allow_admin_scope: allowAdmin,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast("Дозвіл видано", "success");
      setUserId("");
      setNote("");
      loadGrants();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Помилка", "error");
    } finally {
      setSaving(false);
    }
  }

  async function revokeGrant(targetId: string) {
    if (!confirm("Забрати дозвіл на API ключі?")) return;
    try {
      const res = await fetch(`/api/admin/api-key-grants/${targetId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast("Дозвіл відкликано", "success");
      loadGrants();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Помилка", "error");
    }
  }

  return (
    <section className="card-dark p-6 mb-8">
      <p className="micro-cap text-ink-mute mb-2">ІНТЕГРАЦІЇ</p>
      <h2 className="heading-sub mb-2">ДОЗВОЛИ НА API</h2>
      <p className="text-on-primary-mute text-sm mb-6 max-w-2xl">
        Звичайні учасники не можуть створювати ключі. Тут ти видаєш дозвіл конкретним людям — вони
        керуватимуть ключами на сторінці{" "}
        <a href="/developers" className="text-on-primary underline">
          /developers
        </a>
        .
      </p>

      <div className="grid gap-4 mb-8 max-w-xl">
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full px-3 py-2 bg-canvas-night-soft border border-hairline-dark rounded text-on-primary text-sm focus:outline-none focus:border-on-primary-mute"
        >
          <option value="">Обери учасника...</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name} (@{p.username})
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          {["read", "write", "admin"].map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => toggleScope(scope)}
              className={`button-cap px-3 py-1 rounded border text-xs cursor-pointer ${
                scopes.includes(scope)
                  ? "border-on-primary text-on-primary"
                  : "border-hairline-dark text-on-primary-mute"
              }`}
            >
              {scope}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-on-primary-mute cursor-pointer">
          <input
            type="checkbox"
            checked={allowAdmin}
            onChange={(e) => setAllowAdmin(e.target.checked)}
            className="accent-white"
          />
          Дозволити admin scope у ключах
        </label>
        <label className="text-sm text-on-primary-mute flex items-center gap-2">
          Max rate / хв:
          <input
            type="number"
            min={1}
            max={1000}
            value={maxRate}
            onChange={(e) => setMaxRate(Number(e.target.value))}
            className="w-24 px-2 py-1 bg-canvas-night-soft border border-hairline-dark rounded text-on-primary text-sm"
          />
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Нотатка (Telegram-бот Малара...)"
          className="w-full px-3 py-2 bg-canvas-night-soft border border-hairline-dark rounded text-on-primary text-sm focus:outline-none focus:border-on-primary-mute"
        />
        <button
          type="button"
          onClick={grantAccess}
          disabled={saving}
          className="btn-ghost text-on-primary w-fit cursor-pointer disabled:opacity-50"
        >
          {saving ? "ЗБЕРЕЖЕННЯ..." : "ВИДАТИ ДОЗВІЛ"}
        </button>
      </div>

      {loading ? (
        <p className="caption text-ink-mute">Завантаження...</p>
      ) : grants.length === 0 ? (
        <p className="caption text-ink-mute">Нікому ще не видано дозвіл</p>
      ) : (
        <div className="space-y-3">
          {grants.map((g) => (
            <div
              key={g.user_id}
              className="flex flex-wrap items-center justify-between gap-3 p-3 border border-hairline-dark rounded"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  src={g.profiles?.avatar_url}
                  displayName={g.profiles?.display_name}
                  size={36}
                />
                <div>
                  <p className="text-on-primary font-bold">
                    {g.profiles?.display_name || g.user_id.slice(0, 8)}
                  </p>
                  <p className="caption text-ink-mute">
                    {g.allowed_scopes.join(", ")} · max {g.max_rate_limit_per_minute}/хв
                    {g.note ? ` · ${g.note}` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => revokeGrant(g.user_id)}
                className="button-cap text-red-400 hover:text-red-300 cursor-pointer"
              >
                ЗАБРАТИ
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
