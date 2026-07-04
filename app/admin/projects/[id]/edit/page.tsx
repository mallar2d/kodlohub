import { notFound } from "next/navigation";
import ProjectEditorClient from "@/components/project-center/admin/ProjectEditorClient";
import { getAllProjectCenterAdminData } from "@/lib/project-center/queries";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAllProjectCenterAdminData();
  const project = data.projects.find((item) => item.id === id);
  if (!project) notFound();

  return (
    <ProjectEditorClient
      mode="edit"
      project={project}
      sections={data.sections.filter((item) => item.project_id === id)}
      updates={data.updates.filter((item) => item.project_id === id)}
      actions={data.actions.filter((item) => item.project_id === id)}
      gallery={data.gallery.filter((item) => item.project_id === id)}
    />
  );
}
