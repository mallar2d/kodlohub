import type { Metadata } from "next";
import ProjectsClient from "./ProjectsClient";
import { getPublicProjectCards, getRecentProjectUpdates } from "@/lib/project-center/queries";

export const metadata: Metadata = {
  title: "Проєкти",
  description: "KodloHub Project Center: ігри, локалізації, AI-проєкти, інструменти і devlog.",
};

export default async function ProjectsPage() {
  const [projects, recentUpdates] = await Promise.all([
    getPublicProjectCards(),
    getRecentProjectUpdates(8),
  ]);

  return (
    <div className="min-h-screen px-4 pb-16 pt-24 sm:px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-12">
          <p className="micro-cap mb-2 text-ink-mute">KodloHub Project Center</p>
          <h1 className="heading-section mb-4">Проєкти</h1>
          <p className="max-w-3xl text-lg leading-8 text-on-primary-mute">
            Вітрина, devlog і архів усіх активних, завершених і експериментальних напрямів екосистеми.
          </p>
        </div>
        <ProjectsClient projects={projects} recentUpdates={recentUpdates} />
      </div>
    </div>
  );
}
