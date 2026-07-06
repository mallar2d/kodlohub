import ProjectEditorClient from "@/components/project-center/admin/ProjectEditorClient";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Новий проєкт",
  description: "Створення нового проєкту в KodloHub Project Center.",
  path: "/projects/new",
  noIndex: true,
});

export default function NewUserProjectPage() {
  return (
    <ProjectEditorClient
      mode="new"
      project={null}
      sections={[]}
      updates={[]}
      actions={[]}
      gallery={[]}
      editBasePath="/projects/manage"
      headingLabel="Project Center / Мій проєкт"
    />
  );
}
