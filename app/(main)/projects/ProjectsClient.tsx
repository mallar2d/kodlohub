"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ProjectCard from "@/components/project-center/ProjectCard";
import { GlobalUpdateList } from "@/components/project-center/UpdateList";
import { priorityLabels, priorityRank, PROJECT_PRIORITIES, PROJECT_STATUSES, statusLabels } from "@/lib/project-center/constants";
import type { GlobalProjectUpdate, ProjectCardView, ProjectPriority, ProjectStatus } from "@/lib/project-center/types";

type SortMode = "updated" | "progress" | "priority";

function lastUpdateTime(project: ProjectCardView) {
  return new Date(project.latest_update?.published_at || project.updated_at || project.created_at).getTime();
}

function sectionProjects(projects: ProjectCardView[], section: "featured" | "active" | "paused" | "finished" | "archive") {
  if (section === "featured") return projects.filter((project) => project.is_featured || project.priority === "main_focus");
  if (section === "active") return projects.filter((project) => ["active", "prototype", "maintained", "planned"].includes(project.status));
  if (section === "paused") return projects.filter((project) => project.status === "paused");
  if (section === "finished") return projects.filter((project) => project.status === "finished");
  return projects.filter((project) => ["archived", "cancelled", "abandoned"].includes(project.status) || project.visibility === "archived");
}

export default function ProjectsClient({
  projects,
  recentUpdates,
}: {
  projects: ProjectCardView[];
  recentUpdates: GlobalProjectUpdate[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [type, setType] = useState("all");
  const [priority, setPriority] = useState<ProjectPriority | "all">("all");
  const [sort, setSort] = useState<SortMode>("updated");

  const projectTypes = useMemo(() => {
    const set = new Set<string>();
    for (const project of projects) for (const item of project.types || []) set.add(item);
    return [...set].sort();
  }, [projects]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects
      .filter((project) => {
        const haystack = [project.title, project.short_description, project.one_liner, ...(project.tags || [])]
          .join(" ")
          .toLowerCase();
        return !query || haystack.includes(query);
      })
      .filter((project) => status === "all" || project.status === status)
      .filter((project) => type === "all" || (project.types || []).includes(type))
      .filter((project) => priority === "all" || project.priority === priority)
      .sort((a, b) => {
        if (sort === "progress") return b.progress_percent - a.progress_percent;
        if (sort === "priority") return priorityRank[b.priority] - priorityRank[a.priority];
        return lastUpdateTime(b) - lastUpdateTime(a);
      });
  }, [projects, priority, search, sort, status, type]);

  const sections = [
    { key: "featured" as const, eyebrow: "Головні проєкти", title: "Фокус" },
    { key: "active" as const, eyebrow: "Активні", title: "У роботі" },
    { key: "paused" as const, eyebrow: "На паузі", title: "Очікують" },
    { key: "finished" as const, eyebrow: "Завершені", title: "Готове" },
    { key: "archive" as const, eyebrow: "Архів", title: "Історія" },
  ];

  return (
    <div className="space-y-16">
      <section className="grid gap-4 border-y border-hairline-dark py-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Пошук по назві..."
            className="w-full rounded border border-hairline-dark bg-canvas-night-soft px-4 py-3 text-on-primary placeholder:text-ink-mute focus:border-on-primary-mute focus:outline-none"
          />
          <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | "all")} className="rounded border border-hairline-dark bg-canvas-night-soft px-4 py-3 text-on-primary">
            <option value="all">Усі статуси</option>
            {PROJECT_STATUSES.map((item) => (
              <option key={item} value={item}>{statusLabels[item]}</option>
            ))}
          </select>
          <select value={type} onChange={(event) => setType(event.target.value)} className="rounded border border-hairline-dark bg-canvas-night-soft px-4 py-3 text-on-primary">
            <option value="all">Усі типи</option>
            {projectTypes.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select value={priority} onChange={(event) => setPriority(event.target.value as ProjectPriority | "all")} className="rounded border border-hairline-dark bg-canvas-night-soft px-4 py-3 text-on-primary">
            <option value="all">Усі пріоритети</option>
            {PROJECT_PRIORITIES.map((item) => (
              <option key={item} value={item}>{priorityLabels[item]}</option>
            ))}
          </select>
        </div>
        <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="rounded border border-hairline-dark bg-canvas-night-soft px-4 py-3 text-on-primary">
          <option value="updated">Останнє оновлення</option>
          <option value="progress">Прогрес</option>
          <option value="priority">Пріоритет</option>
        </select>
      </section>

      {sections.map((section) => {
        const items = sectionProjects(filtered, section.key);
        if (items.length === 0) return null;
        return (
          <section key={section.key}>
            <p className="micro-cap mb-2 text-ink-mute">{section.eyebrow}</p>
            <h2 className="heading-section mb-6">{section.title}</h2>
            <div className="grid gap-6">
              {items.map((project) => <ProjectCard key={`${section.key}-${project.id}`} project={project} />)}
            </div>
          </section>
        );
      })}

      {filtered.length === 0 && (
        <section className="border-y border-hairline-dark py-16 text-center">
          <p className="heading-sub mb-3 text-hairline-dark">Нічого не знайдено</p>
          <p className="text-on-primary-mute">Спробуй змінити пошук або фільтри.</p>
        </section>
      )}

      <section className="grid gap-8 border-t border-hairline-dark pt-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="micro-cap mb-2 text-ink-mute">Останні оновлення</p>
          <h2 className="heading-section mb-4">Devlog</h2>
          <Link href="/projects/updates" className="btn-ghost inline-flex text-on-primary">Уся стрічка</Link>
        </div>
        <GlobalUpdateList updates={recentUpdates.slice(0, 5)} />
      </section>
    </div>
  );
}
