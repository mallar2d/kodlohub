export default function ProjectBadge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "accent" | "muted";
}) {
  const classes = {
    default: "border-hairline-dark text-on-primary-mute",
    accent: "border-on-primary/40 text-on-primary bg-on-primary/10",
    muted: "border-hairline-dark text-ink-mute",
  };

  return (
    <span className={`button-cap inline-flex items-center rounded-full border px-3 py-1 text-[10px] ${classes[tone]}`}>
      {children}
    </span>
  );
}
