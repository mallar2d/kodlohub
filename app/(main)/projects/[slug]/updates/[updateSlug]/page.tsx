import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ProjectBadge from "@/components/project-center/ProjectBadge";
import { formatDate, plainSummary, publicUrl } from "@/lib/project-center/format";
import { getPublicProjectUpdate } from "@/lib/project-center/queries";
import { updateTypeLabels } from "@/lib/project-center/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; updateSlug: string }>;
}): Promise<Metadata> {
  const { slug, updateSlug } = await params;
  const data = await getPublicProjectUpdate(slug, updateSlug);
  if (!data) return {};

  const description = data.update.summary || plainSummary(data.update.body_markdown, 160);
  const image = data.update.cover_image_url || data.project.social_image_url || data.project.cover_image_url || undefined;

  return {
    title: `${data.update.title} / ${data.project.title}`,
    description,
    openGraph: {
      title: data.update.title,
      description,
      url: publicUrl(`/projects/${data.project.slug}/updates/${data.update.slug}`),
      images: image ? [{ url: image }] : undefined,
    },
    alternates: {
      canonical: publicUrl(`/projects/${data.project.slug}/updates/${data.update.slug}`),
    },
  };
}

export default async function ProjectUpdatePage({
  params,
}: {
  params: Promise<{ slug: string; updateSlug: string }>;
}) {
  const { slug, updateSlug } = await params;
  const data = await getPublicProjectUpdate(slug, updateSlug);
  if (!data) notFound();

  const { project, update, gallery } = data;
  const accent = project.accent_color || "#ffffff";

  return (
    <div className="min-h-screen px-4 pb-16 pt-24 sm:px-6">
      <article className="mx-auto max-w-[980px]">
        <nav className="mb-8 flex flex-wrap items-center gap-2">
          <Link href="/projects" className="micro-cap text-ink-mute transition-colors hover:text-on-primary">Проєкти</Link>
          <span className="text-ink-mute">/</span>
          <Link href={`/projects/${project.slug}`} className="micro-cap text-ink-mute transition-colors hover:text-on-primary">{project.title}</Link>
          <span className="text-ink-mute">/</span>
          <span className="micro-cap text-on-primary">Оновлення</span>
        </nav>

        <header className="border-b border-hairline-dark pb-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <ProjectBadge tone="accent">{updateTypeLabels[update.update_type]}</ProjectBadge>
            {update.is_pinned && <ProjectBadge>PINNED</ProjectBadge>}
            <span className="caption text-ink-mute">{formatDate(update.published_at)}</span>
          </div>
          <h1 className="heading-section mb-4">{update.title}</h1>
          {update.summary && <p className="max-w-3xl text-lg leading-8 text-on-primary-mute">{update.summary}</p>}
        </header>

        {update.cover_image_url && (
          <div
            className="my-8 min-h-[360px] border border-hairline-dark bg-canvas-night-soft bg-cover bg-center"
            style={{ backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,0.75)), url(${update.cover_image_url})` }}
          />
        )}

        <div className="prose prose-invert max-w-none py-8 text-on-primary-mute" style={{ borderTop: `2px solid ${accent}` }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{update.body_markdown}</ReactMarkdown>
        </div>

        {gallery.length > 0 && (
          <section className="mt-10 border-t border-hairline-dark pt-8">
            <p className="micro-cap mb-2 text-ink-mute">Галерея</p>
            <div className="grid gap-4 md:grid-cols-2">
              {gallery.map((item) => (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="block min-h-[220px] border border-hairline-dark bg-canvas-night-soft bg-cover bg-center p-4" style={{ backgroundImage: item.kind === "image" ? `linear-gradient(180deg, transparent, rgba(0,0,0,0.8)), url(${item.thumbnail_url || item.url})` : undefined }}>
                  <div className="mt-36">
                    {item.title && <p className="font-bold text-on-primary">{item.title}</p>}
                    {item.caption && <p className="caption text-on-primary-mute">{item.caption}</p>}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
