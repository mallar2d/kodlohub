export default function ProgressBar({
  value,
  color = "#ffffff",
  compact = false,
}: {
  value: number;
  color?: string | null;
  compact?: boolean;
}) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value || 0)));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="micro-cap text-ink-mute">Прогрес</span>
        <span className="button-cap text-on-primary">{safeValue}%</span>
      </div>
      <div className={`w-full overflow-hidden rounded-full bg-canvas-night-soft ${compact ? "h-2" : "h-3"}`}>
        <div
          className="h-full rounded-full"
          style={{ width: `${safeValue}%`, backgroundColor: color || "#ffffff" }}
        />
      </div>
    </div>
  );
}
