import ProjectEditorClient from "@/components/project-center/admin/ProjectEditorClient";

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
