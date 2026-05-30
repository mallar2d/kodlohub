"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface LoreItem {
  id: string;
  title: string;
  description: string;
  category: string;
  media_id: string | null;
  author_id: string;
  created_at: string;
}

const categories = [
  { key: "all", label: "ВСЕ" },
  { key: "person", label: "ЛЮДИ" },
  { key: "event", label: "ПОДІЇ" },
  { key: "artifact", label: "АРТЕФАКТИ" },
  { key: "meme", label: "МЕМИ" },
  { key: "quote", label: "ЦИТАТИ" },
];

const categoryColors: Record<string, string> = {
  person: "border-blue-500/50 text-blue-400",
  event: "border-green-500/50 text-green-400",
  artifact: "border-yellow-500/50 text-yellow-400",
  meme: "border-purple-500/50 text-purple-400",
  quote: "border-pink-500/50 text-pink-400",
};

export default function LorePage() {
  const [items, setItems] = useState<LoreItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function fetchLore() {
      let query = supabase
        .from("lore_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("category", filter);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data } = await query;
      setItems(data || []);
      setLoading(false);
    }

    fetchLore();
  }, [filter, search, supabase]);

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="micro-cap text-ink-mute mb-2">АРХІВ КОДЛА</p>
          <h1 className="heading-section mb-4">ЛОРА-БІБЛІОТЕКА</h1>
          <p className="text-on-primary-mute text-lg max-w-2xl">
            Все найкраще, що створило кодло. Від мемів до фільмів. Від ботів до
            ігор.
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="ШУКАТИ В ЛОРІ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setFilter(cat.key)}
              className={`button-cap px-4 py-2 rounded-full border transition-opacity ${
                filter === cat.key
                  ? "border-on-primary text-on-primary"
                  : "border-hairline-dark text-ink-mute hover:text-on-primary"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Lore items */}
        {loading ? (
          <div className="text-center py-24">
            <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24">
            <p className="heading-sub text-hairline-dark mb-4">:(</p>
            <p className="text-on-primary-mute">
              брєдік в чат нє пішем — лора порожня
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="card-dark p-6 hover:border-on-primary-mute transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`button-cap px-3 py-1 rounded-full border ${
                      categoryColors[item.category] || "border-hairline-dark text-ink-mute"
                    }`}
                  >
                    {categories.find((c) => c.key === item.category)?.label ||
                      item.category}
                  </span>
                </div>

                <h3 className="font-bold text-lg text-on-primary mb-2">
                  {item.title}
                </h3>

                <p className="text-on-primary-mute text-sm line-clamp-4">
                  {item.description}
                </p>

                <div className="mt-4 pt-3 border-t border-hairline-dark">
                  <span className="caption text-ink-mute">
                    {new Date(item.created_at).toLocaleDateString("uk-UA")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
