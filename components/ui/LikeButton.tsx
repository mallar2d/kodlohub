"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface LikeButtonProps {
  itemType: "post" | "media" | "lore";
  itemId: string;
  initialCount?: number;
  initialLiked?: boolean;
  compact?: boolean;
}

export default function LikeButton({
  itemType,
  itemId,
  initialCount = 0,
  initialLiked = false,
  compact = false,
}: LikeButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: any } }) => {
      if (data.user) {
        setUser(data.user);
        supabase
          .from("likes")
          .select("id")
          .eq("user_id", data.user.id)
          .eq("item_type", itemType)
          .eq("item_id", itemId)
          .single()
          .then(({ data: existing }: { data: { id: string } | null }) => {
            setLiked(!!existing);
          });
      }
    });
  }, [itemType, itemId, supabase]);

  const toggleLike = async () => {
    if (!user || loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, itemId }),
      });

      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setCount((prev) => (data.liked ? prev + 1 : prev - 1));
      }
    } catch (err) {
      console.error("Like error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <button
      onClick={toggleLike}
      disabled={loading}
      className={`flex items-center gap-1.5 transition-colors ${
        compact ? "text-xs" : "text-sm"
      } ${liked ? "text-red-400" : "text-ink-mute hover:text-red-400"}`}
    >
      <svg
        width={compact ? 14 : 18}
        height={compact ? 14 : 18}
        viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
