import type {
  ACTION_STYLES,
  ACTION_TYPES,
  PROGRESS_STATUSES,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_VISIBILITIES,
  UPDATE_STATUSES,
  UPDATE_TYPES,
} from "./constants";

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];
export type ProjectVisibility = (typeof PROJECT_VISIBILITIES)[number];
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number];
export type UpdateType = (typeof UPDATE_TYPES)[number];
export type UpdateStatus = (typeof UPDATE_STATUSES)[number];
export type ProjectActionType = (typeof ACTION_TYPES)[number];
export type ProjectActionStyle = (typeof ACTION_STYLES)[number];

export interface ProjectCenterProject {
  id: string;
  slug: string;
  title: string;
  one_liner: string | null;
  short_description: string;
  full_description_markdown: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  visibility: ProjectVisibility;
  types: string[] | null;
  tags: string[] | null;
  accent_color: string | null;
  cover_image_url: string | null;
  hero_image_url: string | null;
  logo_url: string | null;
  social_image_url: string | null;
  progress_percent: number;
  progress_mode: "auto" | "manual";
  is_featured: boolean;
  pinned_notice_title: string | null;
  pinned_notice_body: string | null;
  private_notes?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectProgressSection {
  id: string;
  project_id: string;
  parent_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  progress_percent: number;
  progress_mode: "auto" | "manual";
  status: ProgressStatus;
  weight: number;
  is_public: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children?: ProjectProgressSection[];
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  slug: string;
  title: string;
  summary: string | null;
  body_markdown: string;
  update_type: UpdateType;
  status: UpdateStatus;
  cover_image_url: string | null;
  is_pinned: boolean;
  published_at: string | null;
  progress_changes: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectAction {
  id: string;
  project_id: string;
  label: string;
  url: string;
  action_type: ProjectActionType;
  icon: string | null;
  style: ProjectActionStyle;
  open_new_tab: boolean;
  is_public: boolean;
  sort_order: number;
}

export interface ProjectGalleryItem {
  id: string;
  project_id: string;
  update_id: string | null;
  media_id: string | null;
  kind: "image" | "video" | "embed";
  role:
    | "screenshot"
    | "cover"
    | "logo"
    | "concept"
    | "old_screenshot"
    | "comparison"
    | "trailer"
    | "social_preview"
    | "other";
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  caption: string | null;
  is_public: boolean;
  is_hero: boolean;
  is_social_preview: boolean;
  sort_order: number;
}

export interface ProjectCardView extends ProjectCenterProject {
  latest_update: ProjectUpdate | null;
}

export interface ProjectDetailView extends ProjectCenterProject {
  sections: ProjectProgressSection[];
  updates: ProjectUpdate[];
  actions: ProjectAction[];
  gallery: ProjectGalleryItem[];
  latest_update: ProjectUpdate | null;
}

export interface GlobalProjectUpdate extends ProjectUpdate {
  project: Pick<ProjectCenterProject, "id" | "slug" | "title" | "status" | "accent_color">;
}
