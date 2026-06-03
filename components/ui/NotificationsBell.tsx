"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

const svgProps = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const typeIcons: Record<string, ReactNode> = {
  comment: (
    <svg {...svgProps}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  post_approved: (
    <svg {...svgProps}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  post_rejected: (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  role_changed: (
    <svg {...svgProps}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  post_deleted: (
    <svg {...svgProps}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  system: (
    <svg {...svgProps}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
};

const defaultIcon = (
  <svg {...svgProps}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export default function NotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: any } }) => {
      if (data.user) {
        setUser(data.user);
        fetchNotifications(data.user.id);
      }
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { new: Notification }) => {
          const notif = payload.new;
          setNotifications((prev) => [notif, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  async function fetchNotifications(userId: string) {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    setNotifications(data || []);
    setUnreadCount((data || []).filter((n: { read: boolean }) => !n.read).length);
  }

  async function markAsRead(id: string) {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function markAllRead() {
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-on-primary-mute hover:text-on-primary transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-auto bg-canvas-night-soft border border-hairline-dark rounded-lg shadow-xl z-50">
          <div className="flex items-center justify-between p-3 border-b border-hairline-dark">
            <span className="button-cap text-on-primary">СПОВІЩЕННЯ</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="caption text-ink-mute hover:text-on-primary transition-colors"
              >
                Прочитати все
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <p className="caption text-ink-mute">Поки сповіщень немає</p>
            </div>
          ) : (
            <div className="divide-y divide-hairline-dark">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 hover:bg-canvas-night transition-colors cursor-pointer ${
                    !notif.read ? "bg-canvas-night" : ""
                  }`}
                  onClick={() => {
                    markAsRead(notif.id);
                    if (notif.link) setOpen(false);
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-ink-mute mt-0.5 shrink-0">{typeIcons[notif.type] || defaultIcon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-primary">{notif.title}</p>
                      <p className="text-xs text-on-primary-mute line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-ink-mute mt-1">
                        {new Date(notif.created_at).toLocaleString("uk-UA")}
                      </p>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                    )}
                  </div>
                  {notif.link && (
                    <Link
                      href={notif.link}
                      className="block mt-1 caption text-blue-400 hover:underline"
                      onClick={() => setOpen(false)}
                    >
                      Перейти →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
