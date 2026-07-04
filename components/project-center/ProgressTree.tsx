import { calculateSectionProgress } from "@/lib/project-center/progress";
import { progressStatusLabels } from "@/lib/project-center/constants";
import type { ProjectProgressSection } from "@/lib/project-center/types";
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

export default function ProgressTree({ sections, color }: { sections: ProjectProgressSection[]; color?: string | null }) {
  if (sections.length === 0) {
    return <p className="caption text-ink-mute">Публічних секторів прогресу ще немає.</p>;
  }

  return (
    <div>
      {sections.map((section) => (
        <SectionNode key={section.id} section={section} color={color} />
      ))}
    </div>
  );
}
