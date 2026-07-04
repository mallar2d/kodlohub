import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateProjectProgress, nestProgressSections } from "./progress";
import type {
  GlobalProjectUpdate,
  ProjectAction,
  ProjectCardView,
  ProjectCenterProject,
  ProjectDetailView,
  ProjectGalleryItem,
  ProjectProgressSection,
  ProjectUpdate,
} from "./types";

const PUBLIC_PROJECT_VISIBILITIES = ["published", "unlisted", "archived"];

function asSingle<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizeSection(section: ProjectProgressSection): ProjectProgressSection {
  return {
    ...section,
    weight: Number(section.weight || 1),
  };
}

async function getLatestUpdatesByProject(projectIds: string[]): Promise<Map<string, ProjectUpdate>> {
  const latest = new Map<string, ProjectUpdate>();
  if (projectIds.length === 0) return latest;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("project_center_updates")
    .select("*")
    .in("project_id", projectIds)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  for (const update of (data || []) as ProjectUpdate[]) {
    if (!latest.has(update.project_id)) latest.set(update.project_id, update);
  }

  return latest;
}

export const getPublicProjectCards = unstable_cache(
  async (): Promise<ProjectCardView[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("project_center_projects")
      .select("*")
      .in("visibility", PUBLIC_PROJECT_VISIBILITIES)
      .order("is_featured", { ascending: false })
      .order("updated_at", { ascending: false });

    const projects = (data || []) as ProjectCenterProject[];
    const latest = await getLatestUpdatesByProject(projects.map((project) => project.id));

    return projects.map((project) => ({
      ...project,
      latest_update: latest.get(project.id) ?? null,
    }));
  },
  ["project-center-public-cards"],
  { revalidate: 30 },
);

export const getRecentProjectUpdates = unstable_cache(
  async (limit = 12): Promise<GlobalProjectUpdate[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("project_center_updates")
      .select("*, project_center_projects(id, slug, title, status, accent_color, visibility)")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);

    return ((data || []) as Array<ProjectUpdate & { project_center_projects?: ProjectCenterProject | ProjectCenterProject[] }>)
      .map((update) => {
        const project = asSingle(update.project_center_projects);
        if (!project || !PUBLIC_PROJECT_VISIBILITIES.includes(project.visibility)) return null;
        const { project_center_projects: _projectRelation, ...rest } = update;
        void _projectRelation;
        return {
          ...rest,
          project: {
            id: project.id,
            slug: project.slug,
            title: project.title,
            status: project.status,
            accent_color: project.accent_color,
          },
        } satisfies GlobalProjectUpdate;
      })
      .filter((item): item is GlobalProjectUpdate => item !== null);
  },
  ["project-center-recent-updates"],
  { revalidate: 30 },
);

export async function getPublicProjectDetail(slug: string): Promise<ProjectDetailView | null> {
  const supabase = createAdminClient();
  const { data: project } = await supabase
    .from("project_center_projects")
    .select("*")
    .eq("slug", slug)
    .in("visibility", PUBLIC_PROJECT_VISIBILITIES)
    .maybeSingle();

  if (!project) return null;

  const [sectionsRes, updatesRes, actionsRes, galleryRes] = await Promise.all([
    supabase
      .from("project_center_progress_sections")
      .select("*")
      .eq("project_id", project.id)
      .eq("is_public", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("project_center_updates")
      .select("*")
      .eq("project_id", project.id)
      .eq("status", "published")
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false }),
    supabase
      .from("project_center_actions")
      .select("*")
      .eq("project_id", project.id)
      .eq("is_public", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("project_center_gallery_items")
      .select("*")
      .eq("project_id", project.id)
      .eq("is_public", true)
      .order("sort_order", { ascending: true }),
  ]);

  const sections = nestProgressSections(((sectionsRes.data || []) as ProjectProgressSection[]).map(normalizeSection));
  const updates = (updatesRes.data || []) as ProjectUpdate[];
  const progress =
    project.progress_mode === "auto"
      ? calculateProjectProgress(sections, project.progress_percent)
      : project.progress_percent;

  return {
    ...(project as ProjectCenterProject),
    progress_percent: progress,
    sections,
    updates,
    actions: (actionsRes.data || []) as ProjectAction[],
    gallery: (galleryRes.data || []) as ProjectGalleryItem[],
    latest_update: updates[0] ?? null,
  };
}

export async function getPublicProjectUpdate(projectSlug: string, updateSlug: string) {
  const supabase = createAdminClient();
  const { data: project } = await supabase
    .from("project_center_projects")
    .select("*")
    .eq("slug", projectSlug)
    .in("visibility", PUBLIC_PROJECT_VISIBILITIES)
    .maybeSingle();

  if (!project) return null;

  const { data: update } = await supabase
    .from("project_center_updates")
    .select("*")
    .eq("project_id", project.id)
    .eq("slug", updateSlug)
    .eq("status", "published")
    .maybeSingle();

  if (!update) return null;

  const { data: gallery } = await supabase
    .from("project_center_gallery_items")
    .select("*")
    .eq("project_id", project.id)
    .eq("is_public", true)
    .or(`update_id.eq.${update.id},update_id.is.null`)
    .order("sort_order", { ascending: true });

  return {
    project: project as ProjectCenterProject,
    update: update as ProjectUpdate,
    gallery: (gallery || []) as ProjectGalleryItem[],
  };
}

export async function getAllProjectCenterAdminData() {
  const supabase = createAdminClient();
  const [projectsRes, sectionsRes, updatesRes, actionsRes, galleryRes] = await Promise.all([
    supabase.from("project_center_projects").select("*").order("updated_at", { ascending: false }),
    supabase.from("project_center_progress_sections").select("*").order("sort_order", { ascending: true }),
    supabase.from("project_center_updates").select("*").order("updated_at", { ascending: false }),
    supabase.from("project_center_actions").select("*").order("sort_order", { ascending: true }),
    supabase.from("project_center_gallery_items").select("*").order("sort_order", { ascending: true }),
  ]);

  return {
    projects: (projectsRes.data || []) as ProjectCenterProject[],
    sections: ((sectionsRes.data || []) as ProjectProgressSection[]).map(normalizeSection),
    updates: (updatesRes.data || []) as ProjectUpdate[],
    actions: (actionsRes.data || []) as ProjectAction[],
    gallery: (galleryRes.data || []) as ProjectGalleryItem[],
  };
}
