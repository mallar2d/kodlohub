import ProjectEditorClient from "@/components/project-center/admin/ProjectEditorClient";

export default function NewProjectPage() {
  return (
    <ProjectEditorClient
      mode="new"
      project={null}
      sections={[]}
      updates={[]}
      actions={[]}
      gallery={[]}
    />
  );
}
