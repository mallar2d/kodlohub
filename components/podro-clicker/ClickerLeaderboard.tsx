"use client";

import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import { formatGrams } from "@/lib/podro-clicker/gameConfig";

export interface ClickerLeaderboardRow {
  user_id: string;
  career_grams: number;
  respect_points: number;
  prestige_count: number;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface ClickerLeaderboardProps {
  loading: boolean;
  rows: ClickerLeaderboardRow[];
  myUserId?: string | null;
}

export default function ClickerLeaderboard({ loading, rows, myUserId }: ClickerLeaderboardProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-ink-mute text-sm py-4 justify-center">
        <span className="animate-spin w-3 h-3 border border-on-primary border-t-transparent rounded-full" />
        завантаження...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-on-primary-mute text-sm py-4 text-center">
        Ще ніхто не наварив кави. Будь першим баристою.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-1.5">
      {rows.map((row, idx) => {
        const isMe = myUserId === row.user_id;
        const rank = idx + 1;
        const name = row.display_name || row.username || "анонімний кодло";
        return (
          <li
            key={row.user_id}
            className={`flex items-center gap-3 px-3 py-2 rounded ${isMe ? "bg-canvas-night-soft" : ""}`}
          >
            <span
              className={`w-7 text-center font-[var(--font-display)] font-black text-sm ${
                rank === 1
                  ? "text-yellow-300"
                  : rank === 2
                    ? "text-gray-300"
                    : rank === 3
                      ? "text-amber-600"
                      : "text-ink-mute"
              }`}
            >
              {rank}
            </span>
            <Avatar src={row.avatar_url} displayName={row.display_name || row.username} size={28} />
            <Link
              href={`/profile/${row.user_id}`}
              className={`flex-1 truncate text-sm hover:underline ${
                isMe ? "text-on-primary font-bold" : "text-on-primary-mute"
              }`}
            >
              {name}
              {isMe && <span className="ml-2 micro-cap text-ink-mute">(ти)</span>}
              {row.prestige_count > 0 && (
                <span className="ml-2 micro-cap text-purple-400">
                  ×{row.prestige_count} ШЕМЕТ.
                </span>
              )}
            </Link>
            <span className="font-[var(--font-display)] font-black text-on-primary text-base tabular-nums">
              {formatGrams(row.career_grams)}
            </span>
            <span className="micro-cap text-ink-mute hidden sm:inline">г</span>
          </li>
        );
      })}
    </ol>
  );
}
