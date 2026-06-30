"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import Avatar from "@/components/ui/Avatar";
import { getSuggestionTagLabel } from "@/lib/brat-td/suggestion-tags";

interface Suggestion {
  id: string;
  user_id: string;
  description: string;
  tags: string[];
  status: "pending" | "reviewed" | "dismissed";
  created_at: string;
  profiles?: { display_name: string; username: string; avatar_url: string | null };
}

const statusLabels: Record<Suggestion["status"], string> = {
  pending: "НОВА",
  reviewed: "ПЕРЕГЛЯНУТО",
  dismissed: "ВІДХИЛЕНО",
};

const statusColors: Record<Suggestion["status"], string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  reviewed: "bg-green-500/20 text-green-400 border-green-500/50",
  dismissed: "bg-ink-mute/10 text-ink-mute border-hairline-dark",
};

type FilterStatus = "all" | Suggestion["status"];

export default function BratTdSuggestionsAdmin() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    fetchSuggestions();
  }, []);

  async function fetchSuggestions() {
    const { data, error } = await supabase
      .from("brat_td_suggestions")
      .select("*, profiles!user_id(display_name, username, avatar_url)")
      .order("created_at", { ascending: false });

    if (error) {
      toast("Не вдалося завантажити пропозиції", "error");
    } else {
      setSuggestions(
        (data || []).map((row: Suggestion & { profiles?: Suggestion["profiles"] | Suggestion["profiles"][] }) => ({
          ...row,
          profiles: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
        })),
      );
    }

    setLoading(false);
  }

  async function updateStatus(id: string, status: Suggestion["status"]) {
    setUpdating(id);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("brat_td_suggestions")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
      })
      .eq("id", id);

    if (error) {
      toast(error.message, "error");
    } else {
      setSuggestions((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item)),
      );
      toast(status === "reviewed" ? "Позначено як переглянуто" : "Пропозицію відхилено", "success");
    }

    setUpdating(null);
  }

  const filtered = filter === "all" ? suggestions : suggestions.filter((s) => s.status === filter);
  const pendingCount = suggestions.filter((s) => s.status === "pending").length;

  if (loading) {
    return (
      <div className="mb-12">
        <div className="animate-spin w-6 h-6 border-2 border-on-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="mb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="heading-sub text-on-primary">
            BRAT TD — ПРОПОЗИЦІЇ ({pendingCount} нових)
          </h2>
          <p className="caption text-ink-mute mt-1">Ідеї та фідбек від гравців</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["pending", "reviewed", "dismissed", "all"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`button-cap px-3 py-1 rounded border text-xs transition-colors ${
                filter === value
                  ? "bg-on-primary/15 text-on-primary border-on-primary/50"
                  : "text-ink-mute border-hairline-dark hover:text-on-primary"
              }`}
            >
              {value === "all"
                ? "УСІ"
                : value === "pending"
                  ? "НОВІ"
                  : value === "reviewed"
                    ? "ПЕРЕГЛЯНУТІ"
                    : "ВІДХИЛЕНІ"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card-dark p-6 text-on-primary-mute text-sm">Пропозицій немає.</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((suggestion) => (
            <div
              key={suggestion.id}
              className={`card-dark p-6 ${
                suggestion.status === "pending" ? "border-yellow-500/30" : ""
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span
                      className={`button-cap px-2 py-0.5 rounded border text-[10px] ${
                        statusColors[suggestion.status]
                      }`}
                    >
                      {statusLabels[suggestion.status]}
                    </span>
                    <span className="caption text-ink-mute">
                      {new Date(suggestion.created_at).toLocaleString("uk-UA")}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {suggestion.tags.map((tag) => (
                      <span
                        key={tag}
                        className="button-cap px-2 py-0.5 rounded bg-canvas-night-soft border border-hairline-dark text-[10px] text-on-primary-mute"
                      >
                        {getSuggestionTagLabel(tag)}
                      </span>
                    ))}
                  </div>

                  <p className="text-on-primary text-sm whitespace-pre-wrap mb-3">
                    {suggestion.description}
                  </p>

                  <div className="flex items-center gap-2">
                    <Avatar
                      src={suggestion.profiles?.avatar_url}
                      displayName={suggestion.profiles?.display_name}
                      size={24}
                    />
                    <span className="caption text-ink-mute">
                      {suggestion.profiles?.display_name || "?"}
                      {suggestion.profiles?.username
                        ? ` · @${suggestion.profiles.username}`
                        : ""}
                    </span>
                  </div>
                </div>

                {suggestion.status === "pending" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateStatus(suggestion.id, "reviewed")}
                      disabled={updating === suggestion.id}
                      className="button-cap px-4 py-2 rounded-full bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                    >
                      ПЕРЕГЛЯНУТО
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(suggestion.id, "dismissed")}
                      disabled={updating === suggestion.id}
                      className="button-cap px-4 py-2 rounded-full bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                    >
                      ВІДХИЛИТИ
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
