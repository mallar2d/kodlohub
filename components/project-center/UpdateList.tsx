import Link from "next/link";
import { formatDate } from "@/lib/project-center/format";
import { updateTypeLabels } from "@/lib/project-center/constants";
import type { GlobalProjectUpdate, ProjectUpdate } from "@/lib/project-center/types";
import ProjectBadge from "./ProjectBadge";

export function ProjectUpdateList({
  projectSlug,
  updates,
}: {
  projectSlug: string;
  updates: ProjectUpdate[];
}) {
  if (updates.length === 0) return <p className="caption text-ink-mute">Публічних оновлень ще немає.</p>;

  return (
    <div className="space-y-4">
      {updates.map((update) => (
        <Link
          key={update.id}
          href={`/projects/${projectSlug}/updates/${update.slug}`}
          className="block border-t border-hairline-dark py-5 transition-colors hover:border-on-primary-mute"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <ProjectBadge>{updateTypeLabels[update.update_type]}</ProjectBadge>
            {update.is_pinned && <ProjectBadge tone="accent">PINNED</ProjectBadge>}
            <span className="caption text-ink-mute">{formatDate(update.published_at)}</span>
          </div>
          <h3 className="mb-2 text-xl font-bold text-on-primary">{update.title}</h3>
          {update.summary && <p className="text-sm leading-6 text-on-primary-mute">{update.summary}</p>}
        </Link>
      ))}
    </div>
  );
}

export function GlobalUpdateList({ updates }: { updates: GlobalProjectUpdate[] }) {
  if (updates.length === 0) return <p className="caption text-ink-mute">Оновлень ще немає.</p>;

  return (
    <div className="space-y-4">
      {updates.map((update) => (
        <Link
          key={update.id}
          href={`/projects/${update.project.slug}/updates/${update.slug}`}
          className="block border-t border-hairline-dark py-5 transition-colors hover:border-on-primary-mute"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <ProjectBadge tone="accent">{update.project.title}</ProjectBadge>
            <ProjectBadge>{updateTypeLabels[update.update_type]}</ProjectBadge>
            <span className="caption text-ink-mute">{formatDate(update.published_at)}</span>
          </div>
          <h3 className="mb-2 text-xl font-bold text-on-primary">{update.title}</h3>
          {update.summary && <p className="text-sm leading-6 text-on-primary-mute">{update.summary}</p>}
        </Link>
      ))}
    </div>
  );
}
