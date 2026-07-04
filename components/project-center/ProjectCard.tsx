import Link from "next/link";
import { formatDate } from "@/lib/project-center/format";
import { priorityLabels, statusLabels, updateTypeLabels } from "@/lib/project-center/constants";
import type { ProjectCardView } from "@/lib/project-center/types";
import ProgressBar from "./ProgressBar";
import ProjectBadge from "./ProjectBadge";

export default function ProjectCard({ project }: { project: ProjectCardView }) {
  const accent = project.accent_color || "#ffffff";
  const types = project.types || [];
  const tags = project.tags || [];
  const previewImage = project.cover_image_url || project.hero_image_url;

  return (
    <article className="card-dark group grid min-h-[360px] overflow-hidden transition-colors hover:border-on-primary-mute md:grid-cols-[minmax(240px,0.85fr)_1fr]">
      <div
        className="relative min-h-[220px] overflow-hidden border-b border-hairline-dark bg-canvas-night-soft md:border-b-0 md:border-r"
        style={{
          background: `linear-gradient(135deg, ${accent}33, #000 42%, #0a0a0a)`,
        }}
      >
        {previewImage && (
          <img
            src={previewImage}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {project.priority === "main_focus" && <ProjectBadge tone="accent">FOCUS</ProjectBadge>}
          {types.slice(0, 3).map((type) => (
            <ProjectBadge key={type}>{type.toUpperCase()}</ProjectBadge>
          ))}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="h-1 w-24 rounded-full" style={{ backgroundColor: accent }} />
        </div>
      </div>

      <div className="flex flex-col p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <ProjectBadge tone={project.status === "active" ? "accent" : "default"}>{statusLabels[project.status]}</ProjectBadge>
          <ProjectBadge tone="muted">{priorityLabels[project.priority]}</ProjectBadge>
        </div>

        <h3 className="heading-sub mb-3 text-[32px] leading-tight text-on-primary transition-colors group-hover:text-on-primary-mute">
          {project.title}
        </h3>
        <p className="mb-5 line-clamp-3 text-sm leading-6 text-on-primary-mute">{project.short_description}</p>

        <div className="mb-5">
          <ProgressBar value={project.progress_percent} color={accent} compact />
        </div>

        {project.latest_update ? (
          <Link
            href={`/projects/${project.slug}/updates/${project.latest_update.slug}`}
            className="mb-5 block border-t border-hairline-dark pt-4 transition-colors hover:border-on-primary-mute"
            aria-label={`Відкрити останнє оновлення: ${project.latest_update.title}`}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <ProjectBadge tone="accent">Останнє оновлення</ProjectBadge>
              <ProjectBadge tone="muted">{updateTypeLabels[project.latest_update.update_type]}</ProjectBadge>
              <span className="caption text-ink-mute">{formatDate(project.latest_update.published_at)}</span>
            </div>
            <p className="line-clamp-2 text-sm font-bold text-on-primary transition-colors hover:text-on-primary-mute">
              {project.latest_update.title}
            </p>
            {project.latest_update.summary && (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-mute">{project.latest_update.summary}</p>
            )}
            <span className="button-cap mt-3 inline-flex text-on-primary-mute">Читати апдейт</span>
          </Link>
        ) : (
          <div className="mb-5 border-t border-hairline-dark pt-4">
            <p className="micro-cap text-ink-mute">Оновлень ще немає</p>
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-2">
          {tags.slice(0, 6).map((tag) => (
            <span key={tag} className="caption rounded border border-hairline-dark px-2 py-1 text-ink-mute">
              #{tag}
            </span>
          ))}
        </div>

        <div className="mt-auto">
          <Link href={`/projects/${project.slug}`} className="btn-ghost inline-flex text-on-primary">
            Відкрити проєкт
          </Link>
        </div>
      </div>
    </article>
  );
}
