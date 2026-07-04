"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_minute: number;
  service_user_id?: string | null;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

interface AccessInfo {
  canManage: boolean;
  isOwner?: boolean;
  reason?: string;
  grant?: {
    allowed_scopes: string[];
    max_rate_limit_per_minute: number;
    allow_admin_scope: boolean;
    note?: string;
  };
}

const ALL_SCOPES = ["read", "write", "admin"];

export default function ApiKeysPanel() {
  const { toast } = useToast();
  const [access, setAccess] = useState<AccessInfo | null>(null);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read"]);
  const [rateLimit, setRateLimit] = useState(60);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const allowedScopes = access?.isOwner
    ? ALL_SCOPES
    : (access?.grant?.allowed_scopes ?? []);
  const maxRate = access?.isOwner
    ? 1000
    : (access?.grant?.max_rate_limit_per_minute ?? 60);

  async function loadAccess() {
    const res = await fetch("/api/admin/api-key-grants");
    const data = await res.json();
    setAccess(data);
    return data as AccessInfo;
  }

  async function loadKeys() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/api-keys");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load keys");
      setKeys(data.keys || []);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Помилка", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccess().then((a) => {
      if (a.canManage) {
        setScopes(a.grant?.allowed_scopes?.length ? [a.grant.allowed_scopes[0]] : ["read"]);
        setRateLimit(a.grant?.max_rate_limit_per_minute ?? 60);
        loadKeys();
      } else {
        setLoading(false);
      }
    });
  }, []);

  function toggleScope(scope: string) {
    if (!allowedScopes.includes(scope)) return;
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  async function createKey() {
    if (!name.trim()) {
      toast("Вкажи назву ключа", "error");
      return;
    }
    setCreating(true);
    setNewSecret(null);
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          scopes,
          rate_limit_per_minute: rateLimit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create key");
      setNewSecret(data.secret);
      setName("");
      toast("API ключ створено", "success");
      loadKeys();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Помилка", "error");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    if (!confirm("Відкликати цей API ключ?")) return;
    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke");
      toast("Ключ відкликано", "success");
      loadKeys();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Помилка", "error");
    }
  }

  if (!access) {
    return <p className="caption text-ink-mute">Перевірка доступу...</p>;
  }

  if (!access.canManage) {
    return (
      <div className="card-dark p-6 border border-hairline-dark">
        <p className="micro-cap text-ink-mute mb-2">API КЛЮЧІ</p>
        <p className="text-on-primary-mute text-sm">
          {access.reason === "not_logged_in"
            ? "Увійди в акаунт, щоб керувати ключами (якщо owner видав дозвіл)."
            : "У тебе немає дозволу на API ключі. Попроси owner видати доступ в адмін-панелі."}
        </p>
      </div>
    );
  }

  return (
    <section className="card-dark p-6 border border-hairline-dark">
      <p className="micro-cap text-ink-mute mb-2">КЛЮЧІ</p>
      <h2 className="heading-sub mb-2">МОЇ API КЛЮЧІ</h2>
      {access.grant?.note && (
        <p className="caption text-ink-mute mb-4">Дозвіл: {access.grant.note}</p>
      )}
      {!access.isOwner && (
        <p className="text-on-primary-mute text-sm mb-4">
          Write-операції виконуються від твого профілю автоматично. Дозволені scopes:{" "}
          {allowedScopes.join(", ")} (max {maxRate}/хв).
        </p>
      )}

      <div className="grid gap-4 mb-6 max-w-xl">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Назва (Telegram Bot, Discord...)"
          className="w-full px-3 py-2 bg-canvas-night-soft border border-hairline-dark rounded text-on-primary text-sm focus:outline-none focus:border-on-primary-mute"
        />
        <div className="flex flex-wrap gap-2">
          {ALL_SCOPES.map((scope) => {
            const enabled = allowedScopes.includes(scope);
            return (
              <button
                key={scope}
                type="button"
                disabled={!enabled}
                onClick={() => toggleScope(scope)}
                className={`button-cap px-3 py-1 rounded border text-xs cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  scopes.includes(scope) && enabled
                    ? "border-on-primary text-on-primary"
                    : "border-hairline-dark text-on-primary-mute"
                }`}
              >
                {scope}
              </button>
            );
          })}
        </div>
        {access.isOwner && (
          <label className="text-sm text-on-primary-mute flex items-center gap-2">
            Rate limit / хв:
            <input
              type="number"
              min={1}
              max={1000}
              value={rateLimit}
              onChange={(e) => setRateLimit(Number(e.target.value))}
              className="w-24 px-2 py-1 bg-canvas-night-soft border border-hairline-dark rounded text-on-primary text-sm"
            />
          </label>
        )}
        <button
          type="button"
          onClick={createKey}
          disabled={creating}
          className="btn-ghost text-on-primary w-fit cursor-pointer disabled:opacity-50"
        >
          {creating ? "СТВОРЕННЯ..." : "СТВОРИТИ КЛЮЧ"}
        </button>
      </div>

      {newSecret && (
        <div className="mb-6 p-4 border border-yellow-400/40 rounded bg-yellow-400/5">
          <p className="text-sm text-yellow-400 mb-2 font-bold">Збережи ключ — більше не покажемо:</p>
          <code className="text-xs text-on-primary break-all select-all">{newSecret}</code>
        </div>
      )}

      {loading ? (
        <p className="caption text-ink-mute">Завантаження...</p>
      ) : keys.length === 0 ? (
        <p className="caption text-ink-mute">Ключів ще немає</p>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex flex-wrap items-center justify-between gap-3 p-3 border border-hairline-dark rounded"
            >
              <div>
                <p className="text-on-primary font-bold">{key.name}</p>
                <p className="caption text-ink-mute">
                  {key.key_prefix}... · {key.scopes.join(", ")} · {key.rate_limit_per_minute}/хв
                  {key.revoked_at ? " · ВІДКЛИКАНО" : ""}
                </p>
              </div>
              {!key.revoked_at && (
                <button
                  type="button"
                  onClick={() => revokeKey(key.id)}
                  className="button-cap text-red-400 hover:text-red-300 cursor-pointer"
                >
                  ВІДКЛИКАТИ
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
