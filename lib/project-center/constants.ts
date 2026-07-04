export const PROJECT_STATUSES = [
  "planned",
  "prototype",
  "active",
  "paused",
  "maintained",
  "finished",
  "archived",
  "cancelled",
  "abandoned",
] as const;

export const PROJECT_PRIORITIES = [
  "main_focus",
  "high",
  "medium",
  "low",
  "frozen",
  "experimental",
  "archival",
] as const;

export const PROJECT_VISIBILITIES = ["draft", "published", "hidden", "unlisted", "archived"] as const;

export const PROJECT_TYPES = [
  "game",
  "website",
  "platform",
  "localization",
  "mod",
  "ai",
  "utility",
  "library",
  "documentation",
  "experiment",
  "fan-project",
  "open-source",
  "private",
] as const;

export const PROGRESS_STATUSES = [
  "not_started",
  "in_progress",
  "partial",
  "nearly_done",
  "done",
  "needs_rework",
  "blocked",
  "issue",
  "deferred",
] as const;

export const UPDATE_TYPES = [
  "devlog",
  "patch_note",
  "release",
  "announcement",
  "screenshot_drop",
  "progress_update",
  "technical_update",
  "localization_update",
  "roadmap_update",
  "delay_notice",
  "pause_notice",
  "archive_note",
  "hotfix",
  "milestone_reached",
] as const;

export const UPDATE_STATUSES = ["draft", "published", "hidden", "archived"] as const;

export const ACTION_TYPES = [
  "play",
  "download",
  "github",
  "website",
  "documentation",
  "steam",
  "discord",
  "trailer",
  "mod_page",
  "install_guide",
  "read_more",
  "support",
  "changelog",
] as const;

export const ACTION_STYLES = ["primary", "secondary", "danger", "ghost"] as const;

export const statusLabels: Record<(typeof PROJECT_STATUSES)[number], string> = {
  planned: "Planned",
  prototype: "Prototype",
  active: "Active",
  paused: "Paused",
  maintained: "Maintained",
  finished: "Finished",
  archived: "Archived",
  cancelled: "Cancelled",
  abandoned: "Abandoned",
};

export const priorityLabels: Record<(typeof PROJECT_PRIORITIES)[number], string> = {
  main_focus: "Головний фокус",
  high: "Високий",
  medium: "Середній",
  low: "Низький",
  frozen: "Заморожений",
  experimental: "Експериментальний",
  archival: "Архівний",
};

export const updateTypeLabels: Record<(typeof UPDATE_TYPES)[number], string> = {
  devlog: "Devlog",
  patch_note: "Patch note",
  release: "Release",
  announcement: "Announcement",
  screenshot_drop: "Screenshot drop",
  progress_update: "Progress update",
  technical_update: "Technical update",
  localization_update: "Localization update",
  roadmap_update: "Roadmap update",
  delay_notice: "Delay notice",
  pause_notice: "Pause notice",
  archive_note: "Archive note",
  hotfix: "Hotfix",
  milestone_reached: "Milestone reached",
};

export const progressStatusLabels: Record<(typeof PROGRESS_STATUSES)[number], string> = {
  not_started: "Не почато",
  in_progress: "В роботі",
  partial: "Частково готово",
  nearly_done: "Майже готово",
  done: "Готово",
  needs_rework: "Потребує переробки",
  blocked: "Заблоковано",
  issue: "Проблема",
  deferred: "Відкладено",
};

export const priorityRank: Record<(typeof PROJECT_PRIORITIES)[number], number> = {
  main_focus: 7,
  high: 6,
  medium: 5,
  experimental: 4,
  low: 3,
  frozen: 2,
  archival: 1,
};

export const sectionRank: Record<string, number> = {
  main_focus: 0,
  active: 1,
  paused: 2,
  finished: 3,
  archived: 4,
};
