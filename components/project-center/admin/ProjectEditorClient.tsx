"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MarkdownEditor from "@/components/ui/MarkdownEditor";
import {
  ChipsInput,
  ColorField,
  Field,
  ImageField,
  SliderField,
  inputClass,
} from "@/components/project-center/admin/EditorFields";
import {
  ACTION_STYLES,
  ACTION_TYPES,
  PROGRESS_STATUSES,
  PROGRESS_SECTION_SCOPES,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  PROJECT_VISIBILITIES,
  UPDATE_STATUSES,
  UPDATE_TYPES,
  priorityLabels,
  progressStatusLabels,
  progressScopeLabels,
  statusLabels,
  updateTypeLabels,
} from "@/lib/project-center/constants";
import { slugifyProjectCenter } from "@/lib/project-center/format";
import type { ProjectAction, ProjectCenterProject, ProjectGalleryItem, ProjectProgressSection, ProjectUpdate } from "@/lib/project-center/types";

type Tab = "overview" | "progress" | "updates" | "actions" | "gallery" | "notes";
type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; text: string };

const blankProject = {
  title: "",
  slug: "",
  one_liner: "",
  short_description: "",
  full_description_markdown: "",
  status: "planned",
  priority: "medium",
  visibility: "draft",
  types: [] as string[],
  tags: [] as string[],
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

type ProjectForm = typeof blankProject;

/* ------------------------------------------------------------------ */
/* Small layout helpers                                               */
/* ------------------------------------------------------------------ */

function Group({
  title,
  description,
  children,
  cols = 2,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  cols?: 1 | 2;
}) {
  return (
    <section className="card-dark p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-on-primary">{title}</h2>
        {description && <p className="caption mt-1 text-ink-mute">{description}</p>}
      </div>
      <div className={`grid gap-5 ${cols === 2 ? "sm:grid-cols-2" : ""}`}>{children}</div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      title={hint}
      className="flex items-center gap-3 text-left"
    >
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
          checked ? "border-on-primary bg-on-primary/80" : "border-hairline-dark bg-canvas-night-soft"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${
            checked ? "translate-x-[22px] bg-canvas-night" : "translate-x-0.5 bg-ink-mute"
          }`}
        />
      </span>
      <span className="text-sm text-on-primary">{label}</span>
    </button>
  );
}

export default function ProjectEditorClient({
  mode,
  project,
  sections,
  updates,
  actions,
  gallery,
  editBasePath = "/admin/projects",
  headingLabel = "Owner / Project Center",
}: {
  mode: "new" | "edit";
  project: ProjectCenterProject | null;
  sections: ProjectProgressSection[];
  updates: ProjectUpdate[];
  actions: ProjectAction[];
  gallery: ProjectGalleryItem[];
  editBasePath?: string;
  headingLabel?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [sectionSaving, setSectionSaving] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [localSections, setLocalSections] = useState(sections);

  const toast = useCallback((text: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, kind, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const [projectForm, setProjectForm] = useState<ProjectForm>(() => project ? {
    title: project.title,
    slug: project.slug,
    one_liner: project.one_liner || "",
    short_description: project.short_description,
    full_description_markdown: project.full_description_markdown || "",
    status: project.status,
    priority: project.priority,
    visibility: project.visibility,
    types: project.types || [],
    tags: project.tags || [],
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
    section_scope: "project",
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

  const sortedSections = useMemo(() => [...localSections].sort((a, b) => a.sort_order - b.sort_order), [localSections]);
  const sortedUpdates = useMemo(() => [...updates].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()), [updates]);

  function updateProjectField<K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) {
    setProjectForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  const saveProject = useCallback(async () => {
    if (!projectForm.title.trim()) {
      toast("Введи назву проєкту.", "error");
      setTab("overview");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...projectForm,
        slug: projectForm.slug || slugifyProjectCenter(projectForm.title),
      };
      const res = await fetch(mode === "new" ? "/api/admin/projects" : `/api/admin/projects/${project!.id}`, {
        method: mode === "new" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setDirty(false);
      toast("Збережено", "success");
      if (mode === "new") router.push(`${editBasePath}/${data.project.id}/edit`);
      else router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Помилка", "error");
    } finally {
      setSaving(false);
    }
  }, [projectForm, mode, project, router, editBasePath, toast]);

  // Cmd/Ctrl+S saves the project-level form.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty && !saving) saveProject();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, saving, saveProject]);

  function resetSectionForm() {
    setSectionForm({
      title: "",
      slug: "",
      parent_id: "",
      description: "",
      progress_percent: 0,
      progress_mode: "manual",
      status: "not_started",
      weight: 1,
      section_scope: "project",
      is_public: true,
      sort_order: 0,
    });
  }

  const sectionFormRef = useRef<HTMLDivElement>(null);

  async function saveSection() {
    if (!project) {
      toast("Спочатку збережи Overview, потім можна додавати сектори.", "error");
      return;
    }
    if (!sectionForm.title.trim()) {
      toast("Введи назву сектору.", "error");
      return;
    }

    setSectionSaving(true);
    try {
      const res = await fetch(
        editingSectionId
          ? `/api/admin/projects/${project.id}/sections/${editingSectionId}`
          : `/api/admin/projects/${project.id}/sections`,
        {
          method: editingSectionId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...sectionForm, slug: sectionForm.slug || slugifyProjectCenter(sectionForm.title) }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не вдалося зберегти сектор");
      setLocalSections((prev) => {
        if (editingSectionId) return prev.map((item) => item.id === editingSectionId ? data.section : item);
        return [...prev, data.section];
      });
      resetSectionForm();
      const wasEdit = Boolean(editingSectionId);
      setEditingSectionId(null);
      toast(wasEdit ? "Сектор оновлено." : "Сектор додано.", "success");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Помилка збереження сектору", "error");
    } finally {
      setSectionSaving(false);
    }
  }

  function editSection(section: ProjectProgressSection) {
    setEditingSectionId(section.id);
    setSectionForm({
      title: section.title,
      slug: section.slug,
      parent_id: section.parent_id || "",
      description: section.description || "",
      progress_percent: section.progress_percent,
      progress_mode: section.progress_mode,
      status: section.status,
      weight: section.weight,
      section_scope: section.section_scope || "project",
      is_public: section.is_public,
      sort_order: section.sort_order,
    });
    sectionFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelSectionEdit() {
    setEditingSectionId(null);
    resetSectionForm();
  }

  async function deleteSection(sectionId: string) {
    if (!project || !confirm("Видалити сектор?")) return;
    const res = await fetch(`/api/admin/projects/${project.id}/sections/${sectionId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data.error || "Не вдалося видалити сектор", "error");
      return;
    }
    setLocalSections((prev) => prev.filter((item) => item.id !== sectionId));
    toast("Сектор видалено.", "success");
    router.refresh();
  }

  async function saveUpdate() {
    if (!project) return;
    if (!updateForm.title.trim()) {
      toast("Введи заголовок оновлення.", "error");
      return;
    }
    const isEdit = Boolean(updateForm.id);
    const res = await fetch(`/api/admin/projects/${project.id}/updates${isEdit ? `/${updateForm.id}` : ""}`, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updateForm, slug: updateForm.slug || slugifyProjectCenter(updateForm.title) }),
    });
    if (!res.ok) toast((await res.json()).error || "Update error", "error");
    else {
      setUpdateForm({ id: "", title: "", slug: "", summary: "", body_markdown: "", update_type: "devlog", status: "draft", cover_image_url: "", is_pinned: false, published_at: "" });
      toast(isEdit ? "Оновлення збережено." : "Оновлення створено.", "success");
      router.refresh();
    }
  }

  async function deleteUpdate(updateId: string) {
    if (!project || !confirm("Видалити оновлення?")) return;
    await fetch(`/api/admin/projects/${project.id}/updates/${updateId}`, { method: "DELETE" });
    toast("Оновлення видалено.", "success");
    router.refresh();
  }

  async function createAction() {
    if (!project) return;
    if (!actionForm.label.trim() || !actionForm.url.trim()) {
      toast("Заповни label і URL кнопки.", "error");
      return;
    }
    const res = await fetch(`/api/admin/projects/${project.id}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actionForm),
    });
    if (!res.ok) toast((await res.json()).error || "Action error", "error");
    else {
      setActionForm({ label: "", url: "", action_type: "read_more", icon: "", style: "secondary", open_new_tab: true, is_public: true, sort_order: 0 });
      toast("Кнопку додано.", "success");
      router.refresh();
    }
  }

  async function deleteAction(actionId: string) {
    if (!project) return;
    await fetch(`/api/admin/projects/${project.id}/actions?actionId=${actionId}`, { method: "DELETE" });
    toast("Кнопку видалено.", "success");
    router.refresh();
  }

  async function createGalleryItem() {
    if (!project) return;
    if (!galleryForm.url.trim()) {
      toast("Додай зображення або URL.", "error");
      return;
    }
    const res = await fetch(`/api/admin/projects/${project.id}/gallery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(galleryForm),
    });
    if (!res.ok) toast((await res.json()).error || "Gallery error", "error");
    else {
      setGalleryForm({ url: "", thumbnail_url: "", title: "", caption: "", kind: "image", role: "screenshot", is_public: true, is_hero: false, is_social_preview: false, sort_order: 0 });
      toast("Медіа додано.", "success");
      router.refresh();
    }
  }

  async function deleteGalleryItem(itemId: string) {
    if (!project) return;
    await fetch(`/api/admin/projects/${project.id}/gallery?itemId=${itemId}`, { method: "DELETE" });
    toast("Медіа видалено.", "success");
    router.refresh();
  }

  const tabs: Array<[Tab, string, number | null]> = [
    ["overview", "Overview", null],
    ["progress", "Progress", sortedSections.length],
    ["updates", "Updates", sortedUpdates.length],
    ["actions", "Actions", actions.length],
    ["gallery", "Gallery", gallery.length],
    ["notes", "Notes", null],
  ];

  const needsProjectFirst = !project;

  return (
    <div className="min-h-screen px-4 pb-32 pt-24 sm:px-6">
      <div className="mx-auto max-w-[1200px]">
        {/* Header */}
        <div className="mb-8">
          <p className="micro-cap mb-2 text-ink-mute">{headingLabel}</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="heading-section">{mode === "new" ? "Новий проєкт" : project?.title}</h1>
            {project && (
              <span
                className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider ${
                  project.approval_status === "approved"
                    ? "border-green-500/40 text-green-300"
                    : project.approval_status === "pending"
                      ? "border-yellow-500/40 text-yellow-200"
                      : "border-red-500/40 text-red-300"
                }`}
              >
                {project.approval_status === "approved"
                  ? "Схвалено"
                  : project.approval_status === "pending"
                    ? "На розгляді"
                    : "Відхилено"}
              </span>
            )}
          </div>
          {project && project.approval_status !== "approved" && (
            <p className="mt-3 rounded border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm leading-6 text-yellow-100">
              {project.approval_status === "pending"
                ? "Проєкт очікує owner approval. Ти можеш редагувати його, але публічно він з’явиться тільки після схвалення."
                : "Проєкт відхилено owner-ом. Можеш відредагувати його і попросити переглянути повторно."}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-8 flex flex-wrap gap-2">
          {tabs.map(([key, label, count]) => {
            const locked = needsProjectFirst && key !== "overview";
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                disabled={locked}
                title={locked ? "Спочатку збережи Overview" : undefined}
                className={`button-cap flex items-center gap-2 rounded-full border px-4 py-2 transition-colors ${
                  tab === key
                    ? "border-on-primary text-on-primary"
                    : "border-hairline-dark text-ink-mute hover:text-on-primary"
                } ${locked ? "cursor-not-allowed opacity-40 hover:text-ink-mute" : ""}`}
              >
                {label}
                {count !== null && count > 0 && (
                  <span className="rounded-full bg-canvas-night-soft px-1.5 text-[10px] text-on-primary-mute">{count}</span>
                )}
                {locked && <span className="text-[10px]">🔒</span>}
              </button>
            );
          })}
        </div>

        {/* -------------------------------------------------------- */}
        {/* OVERVIEW                                                 */}
        {/* -------------------------------------------------------- */}
        {tab === "overview" && (
          <div className="space-y-6">
            <Group title="Основне" description="Як проєкт називається і що це.">
              <Field label="Назва" hint="Публічна назва проєкту. Показується в каталозі, hero-блоці, sitemap і preview.">
                <input className={inputClass} value={projectForm.title} onChange={(e) => updateProjectField("title", e.target.value)} />
              </Field>
              <Field label="Slug" hint="URL-частина після /projects/. Наприклад: brat-td. Якщо лишити пустим, створиться з назви.">
                <input className={inputClass} value={projectForm.slug} onChange={(e) => updateProjectField("slug", e.target.value)} placeholder={projectForm.title ? slugifyProjectCenter(projectForm.title) : "auto from title"} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="One-liner" hint="Короткий рекламний рядок для hero-блоку. 1 речення, яке швидко пояснює суть.">
                  <input className={inputClass} value={projectForm.one_liner} onChange={(e) => updateProjectField("one_liner", e.target.value)} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Короткий опис" hint="Опис для картки в каталозі та meta description. Краще 1-2 речення без markdown.">
                  <input className={inputClass} value={projectForm.short_description} onChange={(e) => updateProjectField("short_description", e.target.value)} />
                </Field>
              </div>
            </Group>

            <Group title="Класифікація" description="Статус, важливість і видимість.">
              <Field label="Status" hint="Поточний стан розробки. Показується публічно.">
                <select className={inputClass} value={projectForm.status} onChange={(e) => updateProjectField("status", e.target.value)}>{PROJECT_STATUSES.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select>
              </Field>
              <Field label="Priority" hint="Наскільки проєкт зараз важливий. main_focus підсвічує його як головний фокус.">
                <select className={inputClass} value={projectForm.priority} onChange={(e) => updateProjectField("priority", e.target.value)}>{PROJECT_PRIORITIES.map((item) => <option key={item} value={item}>{priorityLabels[item]}</option>)}</select>
              </Field>
              <Field label="Visibility" hint="draft не видно публічно. published видно в каталозі. unlisted доступний за прямим URL. hidden тільки для owner.">
                <select className={inputClass} value={projectForm.visibility} onChange={(e) => updateProjectField("visibility", e.target.value)}>{PROJECT_VISIBILITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              </Field>
              <div className="flex items-end pb-1">
                <Toggle checked={projectForm.is_featured} onChange={(v) => updateProjectField("is_featured", v)} label="Featured" hint="Додає проєкт у секцію головних/фокусних проєктів каталогу." />
              </div>
              <div className="sm:col-span-2">
                <ChipsInput label="Types" hint="Типи проєкту для фільтрів і бейджів." value={projectForm.types} onChange={(v) => updateProjectField("types", v)} suggestions={PROJECT_TYPES} placeholder="game, website, localization..." />
              </div>
              <div className="sm:col-span-2">
                <ChipsInput label="Tags" hint="Вільні теги: Godot, Ukrainian, demo, Sonic, TTS. Показуються на картці/сторінці." value={projectForm.tags} onChange={(v) => updateProjectField("tags", v)} placeholder="Godot, Ukrainian, demo..." />
              </div>
            </Group>

            <Group title="Прогрес" description="Загальна готовність проєкту." cols={1}>
              <Field label="Режим прогресу" hint="Manual бере відсоток напряму. Auto рахує від секторів з урахуванням їх weight.">
                <div className="flex gap-2">
                  {(["auto", "manual"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateProjectField("progress_mode", m)}
                      className={`button-cap flex-1 rounded border px-4 py-2.5 transition-colors ${
                        projectForm.progress_mode === m ? "border-on-primary text-on-primary" : "border-hairline-dark text-ink-mute hover:text-on-primary"
                      }`}
                    >
                      {m === "auto" ? "Auto (від секторів)" : "Manual (вручну)"}
                    </button>
                  ))}
                </div>
              </Field>
              <SliderField
                label="Progress"
                hint="Загальний відсоток 0-100. При manual показується напряму; при auto це резервне значення."
                value={projectForm.progress_percent}
                onChange={(v) => updateProjectField("progress_percent", v)}
                accent={projectForm.accent_color}
                disabled={projectForm.progress_mode === "auto"}
              />
              {projectForm.progress_mode === "auto" && (
                <p className="caption text-ink-mute">Прогрес рахується автоматично з секторів у вкладці Progress.</p>
              )}
            </Group>

            <Group title="Медіа" description="Завантаж зображення — вони одразу показуються тут.">
              <ImageField label="Cover" hint="Обкладинка для картки в каталозі. Краще горизонтальне 16:9 або 4:3." value={projectForm.cover_image_url} onChange={(v) => updateProjectField("cover_image_url", v)} onError={(m) => toast(m, "error")} />
              <ImageField label="Hero" hint="Великий банер зверху сторінки. Широкий арт 16:9 або 21:9. Якщо пусто — використається Cover." value={projectForm.hero_image_url} onChange={(v) => updateProjectField("hero_image_url", v)} onError={(m) => toast(m, "error")} />
              <ImageField label="Logo" hint="Квадратний логотип/іконка проєкту в hero. Це не обкладинка." value={projectForm.logo_url} onChange={(v) => updateProjectField("logo_url", v)} onError={(m) => toast(m, "error")} aspect="aspect-square" />
              <ImageField label="Social preview" hint="Зображення для Discord/Telegram/OpenGraph. Краще 1200×630. Якщо пусто — береться Hero або Cover." value={projectForm.social_image_url} onChange={(v) => updateProjectField("social_image_url", v)} onError={(m) => toast(m, "error")} />
              <div className="sm:col-span-2">
                <ColorField label="Accent color" hint="HEX-колір проєкту для прогрес-барів, ліній і fallback-фону." value={projectForm.accent_color} onChange={(v) => updateProjectField("accent_color", v)} />
              </div>
            </Group>

            <Group title="Закріплене повідомлення" description="Необов'язковий банер над описом: пауза, реліз, потрібні тестери." cols={1}>
              <Field label="Заголовок" hint="Заголовок важливого повідомлення над описом.">
                <input className={inputClass} value={projectForm.pinned_notice_title} onChange={(e) => updateProjectField("pinned_notice_title", e.target.value)} />
              </Field>
              <Field label="Текст" hint="Текст закріпленого повідомлення. Показується публічно, якщо заповнений заголовок.">
                <textarea className={`${inputClass} min-h-24`} value={projectForm.pinned_notice_body} onChange={(e) => updateProjectField("pinned_notice_body", e.target.value)} />
              </Field>
            </Group>

            <Group title="Повний опис" description="Основний текст сторінки проєкту. Підтримується Markdown." cols={1}>
              <MarkdownEditor
                value={projectForm.full_description_markdown}
                onChange={(v) => updateProjectField("full_description_markdown", v)}
                onUploadError={(m) => toast(m, "error")}
                rows={16}
              />
            </Group>
          </div>
        )}

        {/* -------------------------------------------------------- */}
        {/* PROGRESS                                                 */}
        {/* -------------------------------------------------------- */}
        {tab === "progress" && (
          <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div ref={sectionFormRef} className="card-dark h-fit p-5 lg:sticky lg:top-24">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-on-primary">
                {editingSectionId ? "Редагування сектору" : "Новий сектор"}
              </h2>
              {editingSectionId && (
                <p className="mb-4 rounded border border-on-primary/30 bg-on-primary/10 px-4 py-3 text-sm leading-6 text-on-primary-mute">
                  Редагуєш існуючий сектор. Для майбутньої версії вибери Scope = «Оновлення / версія»; для parent-сектору вибери Mode = «auto».
                </p>
              )}
              <div className="space-y-4">
                <Field label="Title" hint="Назва сектору прогресу: Код, UI, Арт, Тестування тощо.">
                  <input className={inputClass} value={sectionForm.title} onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })} />
                </Field>
                <Field label="Parent" hint="Якщо вибрати parent, сектор стане вкладеним. Наприклад: Геймплей → Вороги, Баланс, Боси.">
                  <select className={inputClass} value={sectionForm.parent_id} onChange={(e) => setSectionForm({ ...sectionForm, parent_id: e.target.value })}><option value="">Top level</option>{sortedSections.filter((s) => s.id !== editingSectionId).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
                </Field>
                <Field label="Scope" hint="Project readiness впливає на готовність проєкту. Update/version показує майбутнє оновлення. Internal краще тримати непублічним.">
                  <select className={inputClass} value={sectionForm.section_scope} onChange={(e) => setSectionForm({ ...sectionForm, section_scope: e.target.value })}>
                    {PROGRESS_SECTION_SCOPES.map((item) => <option key={item} value={item}>{progressScopeLabels[item]}</option>)}
                  </select>
                </Field>
                <Field label="Mode" hint="Manual бере Progress з поля. Auto рахує від вкладених секторів з урахуванням weight.">
                  <div className="flex gap-2">
                    {(["manual", "auto"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSectionForm({ ...sectionForm, progress_mode: m })}
                        className={`button-cap flex-1 rounded border px-3 py-2 transition-colors ${
                          sectionForm.progress_mode === m ? "border-on-primary text-on-primary" : "border-hairline-dark text-ink-mute hover:text-on-primary"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </Field>
                <SliderField
                  label="Progress"
                  hint="Відсоток готовності сектору 0-100. Для manual-секторів це число видно публічно."
                  value={sectionForm.progress_percent}
                  onChange={(v) => setSectionForm({ ...sectionForm, progress_percent: v })}
                  accent={projectForm.accent_color}
                  disabled={sectionForm.progress_mode === "auto"}
                />
                <Field label="Status" hint="Стан сектору словами: не почато, в роботі, майже готово, заблоковано. Пояснює, що означає відсоток.">
                  <select className={inputClass} value={sectionForm.status} onChange={(e) => setSectionForm({ ...sectionForm, status: e.target.value })}>{PROGRESS_STATUSES.map((item) => <option key={item} value={item}>{progressStatusLabels[item]}</option>)}</select>
                </Field>
                <SliderField
                  label="Weight"
                  hint="Вага сектору в загальному прогресі. Бойова система може важити 35, логотип 2."
                  value={sectionForm.weight}
                  onChange={(v) => setSectionForm({ ...sectionForm, weight: v })}
                  accent={projectForm.accent_color}
                />
                <Field label="Description" hint="Коротке пояснення, що входить у сектор і що означає його готовність.">
                  <textarea className={inputClass} value={sectionForm.description} onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })} />
                </Field>
                <Toggle checked={sectionForm.is_public} onChange={(v) => setSectionForm({ ...sectionForm, is_public: v })} label="Public" hint="Якщо вимкнути, сектор буде прихований від публіки, але owner бачитиме його." />
                <div className="flex flex-wrap gap-3 pt-1">
                  <button onClick={saveSection} disabled={sectionSaving || !sectionForm.title.trim()} className="btn-ghost text-on-primary disabled:cursor-not-allowed disabled:opacity-50">
                    {sectionSaving ? "Збереження..." : editingSectionId ? "Оновити сектор" : "Додати сектор"}
                  </button>
                  {editingSectionId && (
                    <button onClick={cancelSectionEdit} className="btn-ghost text-on-primary-mute">
                      Скасувати
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {sortedSections.length === 0 && (
                <div className="card-dark p-8 text-center">
                  <p className="text-on-primary">Ще немає секторів прогресу.</p>
                  <p className="caption mt-1 text-ink-mute">Додай перший сектор ліворуч — наприклад «Код» або «Арт».</p>
                </div>
              )}
              {sortedSections.map((item) => {
                const pct = Math.max(0, Math.min(100, item.progress_percent));
                return (
                  <div key={item.id} className={`card-dark p-4 ${editingSectionId === item.id ? "border-on-primary" : ""}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-bold text-on-primary">
                          {item.parent_id && <span className="text-ink-mute">↳ </span>}
                          {item.title}
                        </p>
                        <p className="caption text-ink-mute">{item.progress_mode} · {progressScopeLabels[item.section_scope || "project"]} · {progressStatusLabels[item.status as keyof typeof progressStatusLabels] || item.status} · weight {item.weight}{!item.is_public && " · 🔒"}</p>
                      </div>
                      <div className="flex shrink-0 gap-3">
                        <button onClick={() => editSection(item)} className="button-cap text-on-primary">Edit</button>
                        <button onClick={() => deleteSection(item.id)} className="button-cap text-red-400">Delete</button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline-dark">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: projectForm.accent_color }} />
                      </div>
                      <span className="w-10 shrink-0 text-right text-xs text-on-primary-mute">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* -------------------------------------------------------- */}
        {/* UPDATES                                                  */}
        {/* -------------------------------------------------------- */}
        {tab === "updates" && (
          <section className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
            <div className="card-dark space-y-4 p-5">
              <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-on-primary">
                {updateForm.id ? "Редагування оновлення" : "Нове оновлення"}
              </h2>
              <Field label="Title" hint="Заголовок апдейту/devlog. Показується в стрічці, на картці й на сторінці.">
                <input className={inputClass} value={updateForm.title} onChange={(e) => setUpdateForm({ ...updateForm, title: e.target.value })} />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Slug" hint="URL-частина після /updates/. Якщо пусто — з title.">
                  <input className={inputClass} value={updateForm.slug} onChange={(e) => setUpdateForm({ ...updateForm, slug: e.target.value })} placeholder={updateForm.title ? slugifyProjectCenter(updateForm.title) : "auto"} />
                </Field>
                <Field label="Type" hint="Тип апдейту для бейджів і фільтрів.">
                  <select className={inputClass} value={updateForm.update_type} onChange={(e) => setUpdateForm({ ...updateForm, update_type: e.target.value })}>{UPDATE_TYPES.map((item) => <option key={item} value={item}>{updateTypeLabels[item]}</option>)}</select>
                </Field>
              </div>
              <Field label="Summary" hint="Короткий опис для картки/стрічки. 1-2 речення без markdown.">
                <input className={inputClass} value={updateForm.summary} onChange={(e) => setUpdateForm({ ...updateForm, summary: e.target.value })} />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Status" hint="draft не видно публічно. published видно на сторінці й у стрічці.">
                  <select className={inputClass} value={updateForm.status} onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}>{UPDATE_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                </Field>
                <div className="flex items-end pb-1">
                  <Toggle checked={updateForm.is_pinned} onChange={(v) => setUpdateForm({ ...updateForm, is_pinned: v })} label="Pinned" hint="Pinned апдейти піднімаються вище у списку оновлень." />
                </div>
              </div>
              <ImageField label="Cover" hint="Обкладинка апдейту. Показується зверху сторінки апдейту." value={updateForm.cover_image_url} onChange={(v) => setUpdateForm({ ...updateForm, cover_image_url: v })} onError={(m) => toast(m, "error")} />
              <Field label="Текст (Markdown)">
                <MarkdownEditor value={updateForm.body_markdown} onChange={(value) => setUpdateForm({ ...updateForm, body_markdown: value })} onUploadError={(m) => toast(m, "error")} rows={16} />
              </Field>
              <div className="flex gap-3">
                <button onClick={saveUpdate} disabled={!project} className="btn-ghost text-on-primary disabled:opacity-50">{updateForm.id ? "Оновити" : "Створити"}</button>
                {updateForm.id && (
                  <button onClick={() => setUpdateForm({ id: "", title: "", slug: "", summary: "", body_markdown: "", update_type: "devlog", status: "draft", cover_image_url: "", is_pinned: false, published_at: "" })} className="btn-ghost text-on-primary-mute">Скасувати</button>
                )}
              </div>
            </div>
            <div className="space-y-3">
              {sortedUpdates.length === 0 && (
                <div className="card-dark p-8 text-center">
                  <p className="text-on-primary">Ще немає оновлень.</p>
                  <p className="caption mt-1 text-ink-mute">Створи перший devlog ліворуч.</p>
                </div>
              )}
              {sortedUpdates.map((item) => (
                <div key={item.id} className={`card-dark p-4 ${updateForm.id === item.id ? "border-on-primary" : ""}`}>
                  <div className="flex items-center gap-2">
                    {item.is_pinned && <span className="text-xs">📌</span>}
                    <p className="font-bold text-on-primary">{item.title}</p>
                  </div>
                  <p className="caption mb-3 text-ink-mute">
                    <span className={item.status === "published" ? "text-green-300" : ""}>{item.status}</span> · {updateTypeLabels[item.update_type as keyof typeof updateTypeLabels] || item.update_type}
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => setUpdateForm({ id: item.id, title: item.title, slug: item.slug, summary: item.summary || "", body_markdown: item.body_markdown, update_type: item.update_type, status: item.status, cover_image_url: item.cover_image_url || "", is_pinned: item.is_pinned, published_at: item.published_at || "" })} className="button-cap text-on-primary">Edit</button>
                    <button onClick={() => deleteUpdate(item.id)} className="button-cap text-red-400">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* -------------------------------------------------------- */}
        {/* ACTIONS                                                  */}
        {/* -------------------------------------------------------- */}
        {tab === "actions" && (
          <section className="grid gap-8 lg:grid-cols-2">
            <div className="card-dark space-y-4 p-5">
              <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-on-primary">Нова кнопка</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Label" hint="Текст кнопки: Грати, Завантажити, GitHub, Інструкція.">
                  <input className={inputClass} value={actionForm.label} onChange={(e) => setActionForm({ ...actionForm, label: e.target.value })} />
                </Field>
                <Field label="Type" hint="Семантика кнопки для іконок/фільтрів.">
                  <select className={inputClass} value={actionForm.action_type} onChange={(e) => setActionForm({ ...actionForm, action_type: e.target.value })}>{ACTION_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                </Field>
              </div>
              <Field label="URL" hint="Куди веде кнопка. Внутрішній шлях /tools/... або зовнішнє https-посилання.">
                <input className={inputClass} value={actionForm.url} onChange={(e) => setActionForm({ ...actionForm, url: e.target.value })} placeholder="https://..." />
              </Field>
              <Field label="Style" hint="Візуальна важливість. primary для головної дії; secondary/ghost для додаткових.">
                <div className="flex flex-wrap gap-2">
                  {ACTION_STYLES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setActionForm({ ...actionForm, style: s })}
                      className={`button-cap rounded border px-3 py-2 transition-colors ${
                        actionForm.style === s ? "border-on-primary text-on-primary" : "border-hairline-dark text-ink-mute hover:text-on-primary"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
              <button onClick={createAction} disabled={!project} className="btn-ghost text-on-primary disabled:opacity-50">Додати кнопку</button>
            </div>
            <div className="space-y-3">
              {actions.length === 0 && (
                <div className="card-dark p-8 text-center">
                  <p className="text-on-primary">Ще немає кнопок.</p>
                  <p className="caption mt-1 text-ink-mute">Додай першу дію — наприклад «Грати» або «GitHub».</p>
                </div>
              )}
              {actions.map((item) => (
                <div key={item.id} className="card-dark flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-on-primary">{item.label}</p>
                    <p className="caption truncate text-ink-mute">{item.style} · {item.url}</p>
                  </div>
                  <button onClick={() => deleteAction(item.id)} className="button-cap shrink-0 text-red-400">Delete</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* -------------------------------------------------------- */}
        {/* GALLERY                                                  */}
        {/* -------------------------------------------------------- */}
        {tab === "gallery" && (
          <section className="grid gap-8 lg:grid-cols-2">
            <div className="card-dark space-y-4 p-5">
              <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-on-primary">Нове медіа</h2>
              <ImageField label="Зображення" hint="Скріншот, концепт, обкладинка. Завантаж файл або встав URL." value={galleryForm.url} onChange={(v) => setGalleryForm({ ...galleryForm, url: v })} onError={(m) => toast(m, "error")} />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Kind" hint="image для зображень, video для відеофайлу, embed для YouTube/iframe.">
                  <select className={inputClass} value={galleryForm.kind} onChange={(e) => setGalleryForm({ ...galleryForm, kind: e.target.value })}>
                    <option value="image">image</option>
                    <option value="video">video</option>
                    <option value="embed">embed</option>
                  </select>
                </Field>
                <Field label="Role" hint="Роль медіа: screenshot, cover, logo, concept, comparison, trailer.">
                  <select className={inputClass} value={galleryForm.role} onChange={(e) => setGalleryForm({ ...galleryForm, role: e.target.value })}>
                    {["screenshot", "cover", "logo", "concept", "old_screenshot", "comparison", "trailer", "social_preview", "other"].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </Field>
              </div>
              {(galleryForm.kind === "video" || galleryForm.kind === "embed") && (
                <ImageField label="Thumbnail" hint="Preview для відео/embed. Для YouTube краще вказати окрему картинку." value={galleryForm.thumbnail_url} onChange={(v) => setGalleryForm({ ...galleryForm, thumbnail_url: v })} onError={(m) => toast(m, "error")} />
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Title" hint="Назва елемента: Бойова сцена, Головне меню.">
                  <input className={inputClass} value={galleryForm.title} onChange={(e) => setGalleryForm({ ...galleryForm, title: e.target.value })} />
                </Field>
                <Field label="Caption" hint="Короткий підпис: що показано, версія, контекст.">
                  <input className={inputClass} value={galleryForm.caption} onChange={(e) => setGalleryForm({ ...galleryForm, caption: e.target.value })} />
                </Field>
              </div>
              <div className="flex flex-wrap gap-6">
                <Toggle checked={galleryForm.is_public} onChange={(v) => setGalleryForm({ ...galleryForm, is_public: v })} label="Public" hint="Якщо вимкнути, медіа лишиться в базі, але не буде публічним." />
                <Toggle checked={galleryForm.is_hero} onChange={(v) => setGalleryForm({ ...galleryForm, is_hero: v })} label="Hero" />
                <Toggle checked={galleryForm.is_social_preview} onChange={(v) => setGalleryForm({ ...galleryForm, is_social_preview: v })} label="Social" />
              </div>
              <button onClick={createGalleryItem} disabled={!project} className="btn-ghost text-on-primary disabled:opacity-50">Додати медіа</button>
            </div>
            <div className="space-y-3">
              {gallery.length === 0 && (
                <div className="card-dark p-8 text-center">
                  <p className="text-on-primary">Галерея порожня.</p>
                  <p className="caption mt-1 text-ink-mute">Завантаж перший скріншот ліворуч.</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {gallery.map((item) => (
                  <div key={item.id} className="card-dark group relative overflow-hidden p-0">
                    <div className="aspect-video w-full overflow-hidden bg-canvas-night">
                      {item.thumbnail_url || item.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.thumbnail_url || item.url} alt={item.title || ""} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-2 p-2">
                      <span className="truncate text-xs text-on-primary">{item.title || item.role}</span>
                      <button onClick={() => deleteGalleryItem(item.id)} className="button-cap shrink-0 text-red-400">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* -------------------------------------------------------- */}
        {/* NOTES                                                    */}
        {/* -------------------------------------------------------- */}
        {tab === "notes" && (
          <Group title="Приватні нотатки" description="Видно лише тобі й owner-у. Не показується публічно." cols={1}>
            <textarea className={`${inputClass} min-h-80`} value={projectForm.private_notes} onChange={(e) => updateProjectField("private_notes", e.target.value)} />
          </Group>
        )}
      </div>

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-24 right-4 z-50 flex flex-col gap-2 sm:right-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-xl ${
              t.kind === "success"
                ? "border-green-500/40 bg-green-500/10 text-green-100"
                : t.kind === "error"
                  ? "border-red-500/40 bg-red-500/10 text-red-100"
                  : "border-hairline-dark bg-canvas-night-soft text-on-primary-mute"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* Sticky save bar (project-level tabs) */}
      {(tab === "overview" || tab === "notes") && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline-dark bg-canvas-night/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <p className="caption text-ink-mute">
              {saving ? "Збереження..." : dirty ? "Є незбережені зміни" : mode === "new" ? "Заповни та збережи, щоб додати сектори, оновлення й галерею" : "Усі зміни збережено"}
            </p>
            <div className="flex items-center gap-3">
              {dirty && !saving && <span className="hidden text-xs text-ink-mute sm:inline">⌘/Ctrl + S</span>}
              <button
                onClick={saveProject}
                disabled={saving || (!dirty && mode === "edit")}
                className="btn-ghost text-on-primary disabled:opacity-40"
              >
                {saving ? "Збереження..." : mode === "new" ? "Створити проєкт" : "Зберегти"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
