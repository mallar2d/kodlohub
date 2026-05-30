"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface Stats {
  totalUsers: number;
  totalPosts: number;
  totalMedia: number;
  totalComments: number;
  usersByDay: { date: string; count: number }[];
  postsByDay: { date: string; count: number }[];
  mediaByDay: { date: string; count: number }[];
  recentActivity: { action: string; count: number }[];
}

function formatDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function last7Days() {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(formatDay(d));
  }
  return days;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }: { data: { user: any } }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile?.role !== "owner" && profile?.role !== "podrofikovany") {
        router.push("/");
        return;
      }

      await fetchStats();
    });
  }, [supabase, router]);

  async function fetchStats() {
    const days = last7Days();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [usersRes, postsRes, mediaRes, commentsRes, mediaCommentsRes, activityRes] = await Promise.all([
      supabase.from("profiles").select("created_at"),
      supabase.from("posts").select("created_at, status"),
      supabase.from("media").select("created_at"),
      supabase.from("comments").select("created_at"),
      supabase.from("media_comments").select("created_at"),
      supabase.from("activity_log").select("action, created_at").order("created_at", { ascending: false }).limit(100),
    ]);

    const allUsers = usersRes.data || [];
    const allPosts = postsRes.data || [];
    const allMedia = mediaRes.data || [];
    const allComments = [...(commentsRes.data || []), ...(mediaCommentsRes.data || [])];
    const allActivity = activityRes.data || [];

    const usersByDay = days.map((day) => ({
      date: day.slice(5),
      count: allUsers.filter((u: { created_at: string }) => u.created_at?.startsWith(day)).length,
    }));

    const postsByDay = days.map((day) => ({
      date: day.slice(5),
      count: allPosts.filter((p: { created_at: string }) => p.created_at?.startsWith(day)).length,
    }));

    const mediaByDay = days.map((day) => ({
      date: day.slice(5),
      count: allMedia.filter((m: { created_at: string }) => m.created_at?.startsWith(day)).length,
    }));

    const actionCounts: Record<string, number> = {};
    for (const a of allActivity) {
      actionCounts[a.action] = (actionCounts[a.action] || 0) + 1;
    }
    const recentActivity = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    setStats({
      totalUsers: allUsers.length,
      totalPosts: allPosts.length,
      totalMedia: allMedia.length,
      totalComments: allComments.length,
      usersByDay,
      postsByDay,
      mediaByDay,
      recentActivity,
    });

    setLoading(false);
  }

  const actionLabels: Record<string, string> = {
    post_created: "Пости",
    media_uploaded: "Медіа",
    comment_created: "Коментарі",
    like_added: "Лайки",
    role_changed: "Зміна ролі",
    post_approved: "Апрув постів",
    post_deleted: "Видалення постів",
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-12">
            <p className="micro-cap text-ink-mute mb-2">АНАЛІТИКА</p>
            <h1 className="heading-section mb-4">ДАШБОРД</h1>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-dark p-6 animate-pulse">
                <div className="h-8 bg-canvas-night-soft rounded w-16 mb-2" />
                <div className="h-4 bg-canvas-night-soft rounded w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-12">
          <p className="micro-cap text-ink-mute mb-2">АНАЛІТИКА</p>
          <h1 className="heading-section mb-4">ДАШБОРД</h1>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { value: stats.totalUsers, label: "УЧАСНИКІВ" },
            { value: stats.totalPosts, label: "ПОСТІВ" },
            { value: stats.totalMedia, label: "МЕДІА" },
            { value: stats.totalComments, label: "КОМЕНТАРІВ" },
          ].map((stat) => (
            <div key={stat.label} className="card-dark p-6 text-center">
              <p className="heading-sub text-on-primary">{stat.value}</p>
              <p className="micro-cap text-ink-mute mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* Users chart */}
          <div className="card-dark p-6">
            <p className="micro-cap text-ink-mute mb-4">НОВІ УЧАСНИКИ (7 ДНІВ)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.usersByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3f" />
                <XAxis dataKey="date" stroke="#5a5a5f" fontSize={12} />
                <YAxis stroke="#5a5a5f" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #3a3a3f", borderRadius: "8px" }} />
                <Bar dataKey="count" fill="#ffffff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Posts chart */}
          <div className="card-dark p-6">
            <p className="micro-cap text-ink-mute mb-4">НОВІ ПОСТИ (7 ДНІВ)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.postsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3f" />
                <XAxis dataKey="date" stroke="#5a5a5f" fontSize={12} />
                <YAxis stroke="#5a5a5f" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #3a3a3f", borderRadius: "8px" }} />
                <Bar dataKey="count" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Media chart */}
          <div className="card-dark p-6">
            <p className="micro-cap text-ink-mute mb-4">НОВЕ МЕДІА (7 ДНІВ)</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.mediaByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3f" />
                <XAxis dataKey="date" stroke="#5a5a5f" fontSize={12} />
                <YAxis stroke="#5a5a5f" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #3a3a3f", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="count" stroke="#4ade80" strokeWidth={2} dot={{ fill: "#4ade80" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Activity breakdown */}
          <div className="card-dark p-6">
            <p className="micro-cap text-ink-mute mb-4">АКТИВНІСТЬ</p>
            <div className="space-y-3">
              {stats.recentActivity.map((item) => (
                <div key={item.action} className="flex items-center justify-between">
                  <span className="text-sm text-on-primary-mute">{actionLabels[item.action] || item.action}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-canvas-night-soft rounded-full overflow-hidden w-24">
                      <div
                        className="h-full bg-on-primary rounded-full"
                        style={{ width: `${Math.min((item.count / Math.max(...stats.recentActivity.map((a) => a.count))) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink-mute w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
              {stats.recentActivity.length === 0 && (
                <p className="text-sm text-ink-mute text-center py-4">Поки немає даних</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
