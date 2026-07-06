import { notFound, redirect } from "next/navigation";
import ProjectEditorClient from "@/components/project-center/admin/ProjectEditorClient";
import { createClient } from "@/lib/supabase/server";
import { getProjectCenterUserData } from "@/lib/project-center/queries";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = buildPageMetadata({
  title: "Редагувати проєкт",
  description: "Редагування проєкту в KodloHub Project Center.",
  path: "/projects/manage/edit",
  noIndex: true,
});

export default async function EditUserProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const projectData = await getProjectCenterUserData(data.user.id);
  const project = projectData.projects.find((item) => item.id === id);
  if (!project) notFound();

  return (
    <ProjectEditorClient
      mode="edit"
      project={project}
      sections={projectData.sections.filter((item) => item.project_id === id)}
      updates={projectData.updates.filter((item) => item.project_id === id)}
      actions={projectData.actions.filter((item) => item.project_id === id)}
      gallery={projectData.gallery.filter((item) => item.project_id === id)}
      editBasePath="/projects/manage"
      headingLabel="Project Center / Мій проєкт"
    />
  );
}
