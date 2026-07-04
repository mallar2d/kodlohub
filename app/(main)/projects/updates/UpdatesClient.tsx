"use client";

import { useMemo, useState } from "react";
import { GlobalUpdateList } from "@/components/project-center/UpdateList";
import { PROJECT_STATUSES, statusLabels, UPDATE_TYPES, updateTypeLabels } from "@/lib/project-center/constants";
import type { GlobalProjectUpdate, ProjectStatus, UpdateType } from "@/lib/project-center/types";

export default function UpdatesClient({ updates }: { updates: GlobalProjectUpdate[] }) {
  const [search, setSearch] = useState("");
  const [project, setProject] = useState("all");
  const [type, setType] = useState<UpdateType | "all">("all");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");

  const projects = useMemo(() => {
    const map = new Map<string, string>();
    for (const update of updates) map.set(update.project.slug, update.project.title);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [updates]);

  const filtered = updates.filter((update) => {
    const query = search.trim().toLowerCase();
    const haystack = [update.title, update.summary, update.project.title].join(" ").toLowerCase();
    return (
      (!query || haystack.includes(query)) &&
      (project === "all" || update.project.slug === project) &&
      (type === "all" || update.update_type === type) &&
      (status === "all" || update.project.status === status)
    );
  });

  return (
    <div className="space-y-8">
      <section className="grid gap-3 border-y border-hairline-dark py-6 md:grid-cols-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Пошук..."
          className="rounded border border-hairline-dark bg-canvas-night-soft px-4 py-3 text-on-primary placeholder:text-ink-mute"
        />
        <select value={project} onChange={(event) => setProject(event.target.value)} className="rounded border border-hairline-dark bg-canvas-night-soft px-4 py-3 text-on-primary">
          <option value="all">Усі проєкти</option>
          {projects.map(([slug, title]) => <option key={slug} value={slug}>{title}</option>)}
        </select>
        <select value={type} onChange={(event) => setType(event.target.value as UpdateType | "all")} className="rounded border border-hairline-dark bg-canvas-night-soft px-4 py-3 text-on-primary">
          <option value="all">Усі типи</option>
          {UPDATE_TYPES.map((item) => <option key={item} value={item}>{updateTypeLabels[item]}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | "all")} className="rounded border border-hairline-dark bg-canvas-night-soft px-4 py-3 text-on-primary">
          <option value="all">Усі статуси</option>
          {PROJECT_STATUSES.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}
        </select>
      </section>
      <GlobalUpdateList updates={filtered} />
    </div>
  );
}
