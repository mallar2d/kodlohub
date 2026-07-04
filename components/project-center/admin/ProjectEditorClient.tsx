"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MarkdownEditor from "@/components/ui/MarkdownEditor";
import {
  ACTION_STYLES,
  ACTION_TYPES,
  PROGRESS_STATUSES,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_VISIBILITIES,
  UPDATE_STATUSES,
  UPDATE_TYPES,
  priorityLabels,
  progressStatusLabels,
  statusLabels,
  updateTypeLabels,
} from "@/lib/project-center/constants";
import { slugifyProjectCenter } from "@/lib/project-center/format";
import type { ProjectAction, ProjectCenterProject, ProjectGalleryItem, ProjectProgressSection, ProjectUpdate } from "@/lib/project-center/types";

type Tab = "overview" | "progress" | "updates" | "actions" | "gallery" | "notes";

function csv(value: string[] | null | undefined) {
  return (value || []).join(", ");
}

function splitCsv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

const blankProject = {
  title: "",
  slug: "",
  one_liner: "",
  short_description: "",
  full_description_markdown: "",
  status: "planned",
  priority: "medium",
  visibility: "draft",
  types: "",
  tags: "",
  accent_color: "#ffffff",
  cover_image_url: "",
  hero_image_url: "",
  logo_url: "",
  social_image_url: "",
  progress_percent: 0,
  progress_mode: "auto",
  is_featured: false,
  pinned_notice_title: "",
  pinned_notice_body: "",
  private_notes: "",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="micro-cap mb-2 block text-ink-mute">{label}</span>
      {children}
    </label>
  );
}

const inputClass = "w-full rounded border border-hairline-dark bg-canvas-night-soft px-4 py-3 text-on-primary placeholder:text-ink-mute";

export default function ProjectEditorClient({
  mode,
  project,
  sections,
  updates,
  actions,
  gallery,
}: {
  mode: "new" | "edit";
  project: ProjectCenterProject | null;
  sections: ProjectProgressSection[];
  updates: ProjectUpdate[];
  actions: ProjectAction[];
  gallery: ProjectGalleryItem[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [projectForm, setProjectForm] = useState(() => project ? {
    title: project.title,
    slug: project.slug,
    one_liner: project.one_liner || "",
    short_description: project.short_description,
    full_description_markdown: project.full_description_markdown || "",
    status: project.status,
    priority: project.priority,
    visibility: project.visibility,
    types: csv(project.types),
    tags: csv(project.tags),
    accent_color: project.accent_color || "#ffffff",
    cover_image_url: project.cover_image_url || "",
    hero_image_url: project.hero_image_url || "",
    logo_url: project.logo_url || "",
    social_image_url: project.social_image_url || "",
    progress_percent: project.progress_percent,
    progress_mode: project.progress_mode,
    is_featured: project.is_featured,
    pinned_notice_title: project.pinned_notice_title || "",
    pinned_notice_body: project.pinned_notice_body || "",
    private_notes: project.private_notes || "",
  } : blankProject);

  const [sectionForm, setSectionForm] = useState({
    title: "",
    slug: "",
    parent_id: "",
    description: "",
    progress_percent: 0,
    progress_mode: "manual",
    status: "not_started",
    weight: 1,
    is_public: true,
    sort_order: 0,
  });

  const [updateForm, setUpdateForm] = useState({
    id: "",
    title: "",
    slug: "",
    summary: "",
    body_markdown: "",
    update_type: "devlog",
    status: "draft",
    cover_image_url: "",
    is_pinned: false,
    published_at: "",
  });

  const [actionForm, setActionForm] = useState({
    label: "",
    url: "",
    action_type: "read_more",
    icon: "",
    style: "secondary",
    open_new_tab: true,
    is_public: true,
    sort_order: 0,
  });

  const [galleryForm, setGalleryForm] = useState({
    url: "",
    thumbnail_url: "",
    title: "",
    caption: "",
    kind: "image",
    role: "screenshot",
    is_public: true,
    is_hero: false,
    is_social_preview: false,
    sort_order: 0,
  });

  const sortedSections = useMemo(() => [...sections].sort((a, b) => a.sort_order - b.sort_order), [sections]);
  const sortedUpdates = useMemo(() => [...updates].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()), [updates]);

  function updateProjectField<K extends keyof typeof projectForm>(key: K, value: (typeof projectForm)[K]) {
    setProjectForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveProject() {
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        ...projectForm,
        slug: projectForm.slug || slugifyProjectCenter(projectForm.title),
        types: splitCsv(projectForm.types),
        tags: splitCsv(projectForm.tags),
      };
      const res = await fetch(mode === "new" ? "/api/admin/projects" : `/api/admin/projects/${project!.id}`, {
        method: mode === "new" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMessage("Збережено");
      if (mode === "new") router.push(`/admin/projects/${data.project.id}/edit`);
      else router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Помилка");
    } finally {
      setSaving(false);
    }
  }

  async function createSection() {
    if (!project) return;
    const res = await fetch(`/api/admin/projects/${project.id}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...sectionForm, slug: sectionForm.slug || slugifyProjectCenter(sectionForm.title) }),
    });
    if (!res.ok) setMessage((await res.json()).error || "Section error");
    else {
      setSectionForm({ ...sectionForm, title: "", slug: "", description: "" });
      router.refresh();
    }
  }

  async function deleteSection(sectionId: string) {
    if (!project || !confirm("Видалити сектор?")) return;
    await fetch(`/api/admin/projects/${project.id}/sections/${sectionId}`, { method: "DELETE" });
    router.refresh();
  }

  async function saveUpdate() {
    if (!project) return;
    const isEdit = Boolean(updateForm.id);
    const res = await fetch(`/api/admin/projects/${project.id}/updates${isEdit ? `/${updateForm.id}` : ""}`, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updateForm, slug: updateForm.slug || slugifyProjectCenter(updateForm.title) }),
    });
    if (!res.ok) setMessage((await res.json()).error || "Update error");
    else {
      setUpdateForm({ id: "", title: "", slug: "", summary: "", body_markdown: "", update_type: "devlog", status: "draft", cover_image_url: "", is_pinned: false, published_at: "" });
      router.refresh();
    }
  }

  async function deleteUpdate(updateId: string) {
    if (!project || !confirm("Видалити оновлення?")) return;
    await fetch(`/api/admin/projects/${project.id}/updates/${updateId}`, { method: "DELETE" });
    router.refresh();
  }

  async function createAction() {
    if (!project) return;
    const res = await fetch(`/api/admin/projects/${project.id}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actionForm),
    });
    if (!res.ok) setMessage((await res.json()).error || "Action error");
    else {
      setActionForm({ label: "", url: "", action_type: "read_more", icon: "", style: "secondary", open_new_tab: true, is_public: true, sort_order: 0 });
      router.refresh();
    }
  }

  async function deleteAction(actionId: string) {
    if (!project) return;
    await fetch(`/api/admin/projects/${project.id}/actions?actionId=${actionId}`, { method: "DELETE" });
    router.refresh();
  }

  async function createGalleryItem() {
    if (!project) return;
    const res = await fetch(`/api/admin/projects/${project.id}/gallery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(galleryForm),
    });
    if (!res.ok) setMessage((await res.json()).error || "Gallery error");
    else {
      setGalleryForm({ url: "", thumbnail_url: "", title: "", caption: "", kind: "image", role: "screenshot", is_public: true, is_hero: false, is_social_preview: false, sort_order: 0 });
      router.refresh();
    }
  }

  async function deleteGalleryItem(itemId: string) {
    if (!project) return;
    await fetch(`/api/admin/projects/${project.id}/gallery?itemId=${itemId}`, { method: "DELETE" });
    router.refresh();
  }

  const tabs: Array<[Tab, string]> = [
    ["overview", "Overview"],
    ["progress", "Progress"],
    ["updates", "Updates"],
    ["actions", "Actions"],
    ["gallery", "Gallery"],
    ["notes", "Notes"],
  ];

  return (
    <div className="min-h-screen px-4 pb-16 pt-24 sm:px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8">
          <p className="micro-cap mb-2 text-ink-mute">Owner / Project Center</p>
          <h1 className="heading-section">{mode === "new" ? "Новий проєкт" : project?.title}</h1>
          {message && <p className="caption mt-3 text-on-primary-mute">{message}</p>}
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {tabs.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`button-cap rounded-full border px-4 py-2 ${tab === key ? "border-on-primary text-on-primary" : "border-hairline-dark text-ink-mute"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <section className="grid gap-5 lg:grid-cols-2">
            <Field label="Назва"><input className={inputClass} value={projectForm.title} onChange={(e) => updateProjectField("title", e.target.value)} /></Field>
            <Field label="Slug"><input className={inputClass} value={projectForm.slug} onChange={(e) => updateProjectField("slug", e.target.value)} placeholder="auto from title" /></Field>
            <Field label="One-liner"><input className={inputClass} value={projectForm.one_liner} onChange={(e) => updateProjectField("one_liner", e.target.value)} /></Field>
            <Field label="Короткий опис"><input className={inputClass} value={projectForm.short_description} onChange={(e) => updateProjectField("short_description", e.target.value)} /></Field>
            <Field label="Status"><select className={inputClass} value={projectForm.status} onChange={(e) => updateProjectField("status", e.target.value as typeof projectForm.status)}>{PROJECT_STATUSES.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></Field>
            <Field label="Priority"><select className={inputClass} value={projectForm.priority} onChange={(e) => updateProjectField("priority", e.target.value as typeof projectForm.priority)}>{PROJECT_PRIORITIES.map((item) => <option key={item} value={item}>{priorityLabels[item]}</option>)}</select></Field>
            <Field label="Visibility"><select className={inputClass} value={projectForm.visibility} onChange={(e) => updateProjectField("visibility", e.target.value as typeof projectForm.visibility)}>{PROJECT_VISIBILITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
            <Field label="Progress"><input type="number" min="0" max="100" className={inputClass} value={projectForm.progress_percent} onChange={(e) => updateProjectField("progress_percent", Number(e.target.value))} /></Field>
            <Field label="Types CSV"><input className={inputClass} value={projectForm.types} onChange={(e) => updateProjectField("types", e.target.value)} /></Field>
            <Field label="Tags CSV"><input className={inputClass} value={projectForm.tags} onChange={(e) => updateProjectField("tags", e.target.value)} /></Field>
            <Field label="Accent color"><input className={inputClass} value={projectForm.accent_color} onChange={(e) => updateProjectField("accent_color", e.target.value)} /></Field>
            <Field label="Cover URL"><input className={inputClass} value={projectForm.cover_image_url} onChange={(e) => updateProjectField("cover_image_url", e.target.value)} /></Field>
            <Field label="Hero URL"><input className={inputClass} value={projectForm.hero_image_url} onChange={(e) => updateProjectField("hero_image_url", e.target.value)} /></Field>
            <Field label="Logo URL"><input className={inputClass} value={projectForm.logo_url} onChange={(e) => updateProjectField("logo_url", e.target.value)} /></Field>
            <Field label="Pinned title"><input className={inputClass} value={projectForm.pinned_notice_title} onChange={(e) => updateProjectField("pinned_notice_title", e.target.value)} /></Field>
            <Field label="Pinned body"><input className={inputClass} value={projectForm.pinned_notice_body} onChange={(e) => updateProjectField("pinned_notice_body", e.target.value)} /></Field>
            <label className="flex items-center gap-3 text-on-primary"><input type="checkbox" checked={projectForm.is_featured} onChange={(e) => updateProjectField("is_featured", e.target.checked)} /> Featured</label>
            <div className="lg:col-span-2">
              <Field label="Повний опис markdown">
                <textarea className={`${inputClass} min-h-48`} value={projectForm.full_description_markdown} onChange={(e) => updateProjectField("full_description_markdown", e.target.value)} />
              </Field>
            </div>
            <div className="lg:col-span-2">
              <button disabled={saving} onClick={saveProject} className="btn-ghost text-on-primary disabled:opacity-50">{saving ? "Збереження..." : "Зберегти"}</button>
            </div>
          </section>
        )}

        {tab === "progress" && (
          <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="card-dark p-5">
              <h2 className="mb-4 text-xl font-bold uppercase tracking-[0.08em]">Новий сектор</h2>
              <div className="space-y-4">
                <Field label="Title"><input className={inputClass} value={sectionForm.title} onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })} /></Field>
                <Field label="Parent"><select className={inputClass} value={sectionForm.parent_id} onChange={(e) => setSectionForm({ ...sectionForm, parent_id: e.target.value })}><option value="">Top level</option>{sortedSections.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field>
                <Field label="Progress"><input type="number" className={inputClass} value={sectionForm.progress_percent} onChange={(e) => setSectionForm({ ...sectionForm, progress_percent: Number(e.target.value) })} /></Field>
                <Field label="Status"><select className={inputClass} value={sectionForm.status} onChange={(e) => setSectionForm({ ...sectionForm, status: e.target.value })}>{PROGRESS_STATUSES.map((item) => <option key={item} value={item}>{progressStatusLabels[item]}</option>)}</select></Field>
                <Field label="Weight"><input type="number" className={inputClass} value={sectionForm.weight} onChange={(e) => setSectionForm({ ...sectionForm, weight: Number(e.target.value) })} /></Field>
                <Field label="Description"><textarea className={inputClass} value={sectionForm.description} onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })} /></Field>
                <label className="flex items-center gap-3"><input type="checkbox" checked={sectionForm.is_public} onChange={(e) => setSectionForm({ ...sectionForm, is_public: e.target.checked })} /> Public</label>
                <button onClick={createSection} disabled={!project} className="btn-ghost text-on-primary disabled:opacity-50">Додати сектор</button>
              </div>
            </div>
            <div className="space-y-3">
              {sortedSections.map((item) => (
                <div key={item.id} className="card-dark flex items-start justify-between gap-4 p-4">
                  <div>
                    <p className="font-bold text-on-primary">{item.title}</p>
                    <p className="caption text-ink-mute">{item.progress_percent}% / {item.status} / weight {item.weight}</p>
                  </div>
                  <button onClick={() => deleteSection(item.id)} className="button-cap text-red-400">Delete</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "updates" && (
          <section className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
            <div className="space-y-4">
              <Field label="Title"><input className={inputClass} value={updateForm.title} onChange={(e) => setUpdateForm({ ...updateForm, title: e.target.value })} /></Field>
              <Field label="Slug"><input className={inputClass} value={updateForm.slug} onChange={(e) => setUpdateForm({ ...updateForm, slug: e.target.value })} /></Field>
              <Field label="Summary"><input className={inputClass} value={updateForm.summary} onChange={(e) => setUpdateForm({ ...updateForm, summary: e.target.value })} /></Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Type"><select className={inputClass} value={updateForm.update_type} onChange={(e) => setUpdateForm({ ...updateForm, update_type: e.target.value })}>{UPDATE_TYPES.map((item) => <option key={item} value={item}>{updateTypeLabels[item]}</option>)}</select></Field>
                <Field label="Status"><select className={inputClass} value={updateForm.status} onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}>{UPDATE_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
              </div>
              <Field label="Cover URL"><input className={inputClass} value={updateForm.cover_image_url} onChange={(e) => setUpdateForm({ ...updateForm, cover_image_url: e.target.value })} /></Field>
              <label className="flex items-center gap-3"><input type="checkbox" checked={updateForm.is_pinned} onChange={(e) => setUpdateForm({ ...updateForm, is_pinned: e.target.checked })} /> Pinned</label>
              <MarkdownEditor value={updateForm.body_markdown} onChange={(value) => setUpdateForm({ ...updateForm, body_markdown: value })} rows={18} />
              <button onClick={saveUpdate} disabled={!project} className="btn-ghost text-on-primary disabled:opacity-50">{updateForm.id ? "Оновити апдейт" : "Створити апдейт"}</button>
            </div>
            <div className="space-y-3">
              {sortedUpdates.map((item) => (
                <div key={item.id} className="card-dark p-4">
                  <p className="font-bold text-on-primary">{item.title}</p>
                  <p className="caption mb-3 text-ink-mute">{item.status} / {item.update_type}</p>
                  <div className="flex gap-3">
                    <button onClick={() => setUpdateForm({ id: item.id, title: item.title, slug: item.slug, summary: item.summary || "", body_markdown: item.body_markdown, update_type: item.update_type, status: item.status, cover_image_url: item.cover_image_url || "", is_pinned: item.is_pinned, published_at: item.published_at || "" })} className="button-cap text-on-primary">Edit</button>
                    <button onClick={() => deleteUpdate(item.id)} className="button-cap text-red-400">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "actions" && (
          <section className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <Field label="Label"><input className={inputClass} value={actionForm.label} onChange={(e) => setActionForm({ ...actionForm, label: e.target.value })} /></Field>
              <Field label="URL"><input className={inputClass} value={actionForm.url} onChange={(e) => setActionForm({ ...actionForm, url: e.target.value })} /></Field>
              <Field label="Type"><select className={inputClass} value={actionForm.action_type} onChange={(e) => setActionForm({ ...actionForm, action_type: e.target.value })}>{ACTION_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
              <Field label="Style"><select className={inputClass} value={actionForm.style} onChange={(e) => setActionForm({ ...actionForm, style: e.target.value })}>{ACTION_STYLES.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
              <button onClick={createAction} disabled={!project} className="btn-ghost text-on-primary disabled:opacity-50">Додати кнопку</button>
            </div>
            <div className="space-y-3">
              {actions.map((item) => <div key={item.id} className="card-dark flex justify-between p-4"><span>{item.label}</span><button onClick={() => deleteAction(item.id)} className="button-cap text-red-400">Delete</button></div>)}
            </div>
          </section>
        )}

        {tab === "gallery" && (
          <section className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <Field label="URL"><input className={inputClass} value={galleryForm.url} onChange={(e) => setGalleryForm({ ...galleryForm, url: e.target.value })} /></Field>
              <Field label="Title"><input className={inputClass} value={galleryForm.title} onChange={(e) => setGalleryForm({ ...galleryForm, title: e.target.value })} /></Field>
              <Field label="Caption"><input className={inputClass} value={galleryForm.caption} onChange={(e) => setGalleryForm({ ...galleryForm, caption: e.target.value })} /></Field>
              <button onClick={createGalleryItem} disabled={!project} className="btn-ghost text-on-primary disabled:opacity-50">Додати медіа</button>
            </div>
            <div className="space-y-3">
              {gallery.map((item) => <div key={item.id} className="card-dark flex justify-between p-4"><span>{item.title || item.url}</span><button onClick={() => deleteGalleryItem(item.id)} className="button-cap text-red-400">Delete</button></div>)}
            </div>
          </section>
        )}

        {tab === "notes" && (
          <section>
            <Field label="Private notes">
              <textarea className={`${inputClass} min-h-80`} value={projectForm.private_notes} onChange={(e) => updateProjectField("private_notes", e.target.value)} />
            </Field>
            <button disabled={saving} onClick={saveProject} className="btn-ghost mt-4 text-on-primary disabled:opacity-50">Зберегти нотатки</button>
          </section>
        )}
      </div>
    </div>
  );
}
