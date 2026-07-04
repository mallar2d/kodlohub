import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectCenterUserData } from "@/lib/project-center/queries";
import { formatDate } from "@/lib/project-center/format";

export const dynamic = "force-dynamic";

export default async function MyProjectsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { projects } = await getProjectCenterUserData(data.user.id);

  return (
    <div className="min-h-screen px-4 pb-16 pt-24 sm:px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="micro-cap mb-2 text-ink-mute">Project Center</p>
            <h1 className="heading-section">Мої проєкти</h1>
          </div>
          <Link href="/projects/new" className="btn-ghost text-on-primary">Додати проєкт</Link>
        </div>

        {projects.length === 0 ? (
          <div className="border-y border-hairline-dark py-12">
            <p className="text-on-primary-mute">У тебе ще немає проєктів.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/manage/${project.id}/edit`} className="card-dark block p-5 transition-colors hover:border-on-primary-mute">
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="button-cap rounded-full border border-hairline-dark px-3 py-1 text-[10px] text-on-primary-mute">{project.visibility}</span>
                  <span className={`button-cap rounded-full border px-3 py-1 text-[10px] ${
                    project.approval_status === "approved"
                      ? "border-green-500/50 text-green-300"
                      : project.approval_status === "pending"
                        ? "border-yellow-500/50 text-yellow-200"
                        : "border-red-500/50 text-red-300"
                  }`}>
                    {project.approval_status}
                  </span>
                </div>
                <h2 className="text-2xl font-bold uppercase tracking-[0.08em] text-on-primary">{project.title}</h2>
                <p className="mt-2 text-sm text-on-primary-mute">{project.short_description}</p>
                <p className="caption mt-3 text-ink-mute">Оновлено: {formatDate(project.updated_at)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
