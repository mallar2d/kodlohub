import Link from "next/link";
import ProjectsClient from "./ProjectsClient";
import { buildPageMetadata } from "@/lib/seo";
import { getPublicProjectCards, getRecentProjectUpdates } from "@/lib/project-center/queries";

export const metadata = buildPageMetadata({
  title: "Проєкти",
  description: "KodloHub Project Center: ігри, локалізації, AI-проєкти, інструменти і devlog.",
  path: "/projects",
});

export default async function ProjectsPage() {
  const [projects, recentUpdates] = await Promise.all([
    getPublicProjectCards(),
    getRecentProjectUpdates(8),
  ]);

  return (
    <div className="min-h-screen px-4 pb-16 pt-24 sm:px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="micro-cap mb-2 text-ink-mute">KodloHub Project Center</p>
            <h1 className="heading-section mb-4">Проєкти</h1>
            <p className="max-w-3xl text-lg leading-8 text-on-primary-mute">
              Вітрина, devlog і архів усіх активних, завершених і експериментальних напрямів екосистеми.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/projects/manage" className="btn-ghost text-on-primary">Мої проєкти</Link>
            <Link href="/projects/new" className="btn-ghost bg-on-primary text-ink">Додати проєкт</Link>
          </div>
        </div>
        <ProjectsClient projects={projects} recentUpdates={recentUpdates} />
      </div>
    </div>
  );
}
