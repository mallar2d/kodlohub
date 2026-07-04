import { calculateProjectProgress, calculateSectionProgress } from "@/lib/project-center/progress";
import { progressScopeLabels, progressStatusLabels } from "@/lib/project-center/constants";
import type { ProgressSectionScope, ProjectProgressSection } from "@/lib/project-center/types";
import ProgressBar from "./ProgressBar";

function SectionNode({ section, color, depth = 0 }: { section: ProjectProgressSection; color?: string | null; depth?: number }) {
  const value = calculateSectionProgress(section);

  return (
    <div className={depth === 0 ? "border-t border-hairline-dark py-5" : "mt-4 border-l border-hairline-dark pl-4"}>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="font-bold uppercase tracking-[0.08em] text-on-primary">{section.title}</h4>
          {section.description && <p className="mt-1 text-sm leading-6 text-on-primary-mute">{section.description}</p>}
        </div>
        <span className="button-cap shrink-0 rounded-full border border-hairline-dark px-3 py-1 text-[10px] text-ink-mute">
          {progressStatusLabels[section.status]}
        </span>
      </div>
      <ProgressBar value={value} color={color} compact />
      {(section.children || []).length > 0 && (
        <div className="mt-4">
          {section.children!.map((child) => (
            <SectionNode key={child.id} section={child} color={color} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function sectionScope(section: ProjectProgressSection): ProgressSectionScope {
  return section.section_scope || "project";
}

function ScopeGroup({
  title,
  description,
  sections,
  color,
}: {
  title: string;
  description: string;
  sections: ProjectProgressSection[];
  color?: string | null;
}) {
  if (sections.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="mb-2 border-b border-hairline-dark pb-3">
        <p className="micro-cap text-ink-mute">{title}</p>
        <p className="mt-1 text-sm leading-6 text-on-primary-mute">{description}</p>
      </div>
      {sections.map((section) => (
        <SectionNode key={section.id} section={section} color={color} />
      ))}
    </div>
  );
}

export default function ProgressTree({ sections, color }: { sections: ProjectProgressSection[]; color?: string | null }) {
  if (sections.length === 0) {
    return <p className="caption text-ink-mute">Публічних секторів прогресу ще немає.</p>;
  }

  const projectSections = sections.filter((section) => sectionScope(section) === "project");
  const updateSections = sections.filter((section) => sectionScope(section) === "update");
  const internalSections = sections.filter((section) => sectionScope(section) === "internal");
  const projectReady = projectSections.length > 0 && calculateProjectProgress(projectSections, 0) === 100;
  const updateInProgress = updateSections.some((section) => calculateSectionProgress(section) < 100);

  return (
    <div>
      {projectReady && updateInProgress && (
        <div className="mb-6 border border-hairline-dark bg-canvas-night-soft px-4 py-3">
          <p className="button-cap mb-1 text-on-primary">Проєкт готовий, оновлення ще в роботі</p>
          <p className="caption text-on-primary-mute">
            Загальна готовність проєкту рахується окремо від майбутніх версій або контентних оновлень.
          </p>
        </div>
      )}

      <ScopeGroup
        title={progressScopeLabels.project}
        description="Ці сектори показують готовність самого проєкту і впливають на загальний progress."
        sections={projectSections}
        color={color}
      />
      <ScopeGroup
        title={progressScopeLabels.update}
        description="Це робота над наступними оновленнями, версіями або релізами. Вона не знижує готовність базового проєкту."
        sections={updateSections}
        color={color}
      />
      <ScopeGroup
        title={progressScopeLabels.internal}
        description="Внутрішні публічні сектори. Зазвичай такі речі краще приховувати, якщо вони не потрібні відвідувачам."
        sections={internalSections}
        color={color}
      />
    </div>
  );
}
