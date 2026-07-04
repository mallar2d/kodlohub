import Link from "next/link";
import { getAllProjectCenterAdminData } from "@/lib/project-center/queries";
import { priorityLabels, statusLabels } from "@/lib/project-center/constants";
import { formatDate } from "@/lib/project-center/format";

export default async function AdminProjectsPage() {
  const { projects, updates } = await getAllProjectCenterAdminData();

  const drafts = projects.filter((project) => project.visibility === "draft").length;
  const published = projects.filter((project) => project.visibility === "published").length;
  const latestByProject = new Map<string, string>();
  for (const update of updates) {
    if (!latestByProject.has(update.project_id)) latestByProject.set(update.project_id, update.title);
  }

  return (
    <div className="min-h-screen px-4 pb-16 pt-24 sm:px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="micro-cap mb-2 text-ink-mute">Owner / Project Center</p>
            <h1 className="heading-section">Проєкти</h1>
          </div>
          <Link href="/admin/projects/new" className="btn-ghost text-on-primary">Створити проєкт</Link>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="card-dark p-5">
            <p className="micro-cap text-ink-mute">Усього</p>
            <p className="heading-sub">{projects.length}</p>
          </div>
          <div className="card-dark p-5">
            <p className="micro-cap text-ink-mute">Published</p>
            <p className="heading-sub">{published}</p>
          </div>
          <div className="card-dark p-5">
            <p className="micro-cap text-ink-mute">Drafts</p>
            <p className="heading-sub">{drafts}</p>
          </div>
        </div>

        <div className="space-y-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/admin/projects/${project.id}/edit`}
              className="card-dark grid gap-4 p-5 transition-colors hover:border-on-primary-mute md:grid-cols-[1fr_auto]"
            >
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="button-cap rounded-full border border-hairline-dark px-3 py-1 text-[10px] text-on-primary-mute">{statusLabels[project.status]}</span>
                  <span className="button-cap rounded-full border border-hairline-dark px-3 py-1 text-[10px] text-ink-mute">{priorityLabels[project.priority]}</span>
                  <span className="button-cap rounded-full border border-hairline-dark px-3 py-1 text-[10px] text-ink-mute">{project.visibility}</span>
                </div>
                <h2 className="text-2xl font-bold uppercase tracking-[0.08em] text-on-primary">{project.title}</h2>
                <p className="mt-2 text-sm text-on-primary-mute">{project.short_description}</p>
                {latestByProject.get(project.id) && <p className="caption mt-2 text-ink-mute">Останній апдейт: {latestByProject.get(project.id)}</p>}
              </div>
              <div className="text-left md:text-right">
                <p className="button-cap text-on-primary">{project.progress_percent}%</p>
                <p className="caption text-ink-mute">{formatDate(project.updated_at)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
