export function formatDate(value: string | null | undefined): string {
  if (!value) return "Без дати";
  return new Date(value).toLocaleDateString("uk-UA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function slugifyProjectCenter(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function plainSummary(markdown: string, maxLength = 180): string {
  const text = markdown
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[[^\]]+\]\([^)]+\)/g, (match) => match.slice(1).split("]")[0])
    .replace(/[#>*_`~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

export function publicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://kodlo.host";
  return `${base}${path}`;
}
