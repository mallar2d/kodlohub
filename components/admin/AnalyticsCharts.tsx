"use client";

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

interface AnalyticsChartsProps {
  stats: Stats;
  actionLabels: Record<string, string>;
}

export default function AnalyticsCharts({ stats, actionLabels }: AnalyticsChartsProps) {
  return (
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
  );
}
