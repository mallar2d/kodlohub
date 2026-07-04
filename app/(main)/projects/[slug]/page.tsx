import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ProgressBar from "@/components/project-center/ProgressBar";
import ProgressTree from "@/components/project-center/ProgressTree";
import ProjectBadge from "@/components/project-center/ProjectBadge";
import { ProjectUpdateList } from "@/components/project-center/UpdateList";
import OwnerProjectLink from "@/components/project-center/OwnerProjectLink";
import { formatDate, plainSummary, publicUrl } from "@/lib/project-center/format";
import { getPublicProjectDetail } from "@/lib/project-center/queries";
import { priorityLabels, statusLabels } from "@/lib/project-center/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublicProjectDetail(slug);
  if (!project) return {};

  const image = project.social_image_url || project.hero_image_url || project.cover_image_url || undefined;
  const description = project.short_description || plainSummary(project.full_description_markdown || "", 160);

  return {
    title: project.title,
    description,
    openGraph: {
      title: project.title,
      description,
      url: publicUrl(`/projects/${project.slug}`),
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description,
      images: image ? [image] : undefined,
    },
    alternates: {
      canonical: publicUrl(`/projects/${project.slug}`),
    },
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getPublicProjectDetail(slug);
  if (!project) notFound();

  const accent = project.accent_color || "#ffffff";
  const heroImage = project.hero_image_url || project.cover_image_url;

  return (
    <div className="min-h-screen pb-16">
      <section
        className="relative min-h-[72vh] overflow-hidden border-b border-hairline-dark px-4 pb-12 pt-28 sm:px-6"
        style={{
          background: `linear-gradient(135deg, #000 0%, #050505 48%, ${accent}44 100%)`,
        }}
      >
        {heroImage && (
          <>
            <div
              className="absolute inset-0 scale-110 bg-cover bg-center opacity-35 blur-xl"
              style={{ backgroundImage: `url(${heroImage})` }}
            />
            <img
              src={heroImage}
              alt=""
              className="absolute inset-0 h-full w-full object-contain object-center opacity-80"
            />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
        <div className="relative mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <nav className="mb-8 flex items-center gap-2">
              <Link href="/projects" className="micro-cap text-ink-mute transition-colors hover:text-on-primary">Проєкти</Link>
              <span className="text-ink-mute">/</span>
              <span className="micro-cap text-on-primary">{project.title}</span>
            </nav>
            <div className="mb-4 flex flex-wrap gap-2">
              <ProjectBadge tone="accent">{statusLabels[project.status]}</ProjectBadge>
              <ProjectBadge>{priorityLabels[project.priority]}</ProjectBadge>
              {(project.types || []).slice(0, 4).map((type) => <ProjectBadge key={type}>{type.toUpperCase()}</ProjectBadge>)}
            </div>
            {project.logo_url && (
              <div className="mb-5 h-14 w-14 rounded border border-hairline-dark bg-canvas-night-soft bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${project.logo_url})` }} />
            )}
            <h1 className="heading-hero mb-5 max-w-4xl">{project.title}</h1>
            {project.one_liner && <p className="max-w-3xl text-xl leading-8 text-on-primary-mute">{project.one_liner}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              {project.actions.slice(0, 3).map((action) => (
                <a
                  key={action.id}
                  href={action.url}
                  target={action.open_new_tab ? "_blank" : undefined}
                  rel={action.open_new_tab ? "noopener noreferrer" : undefined}
                  className={`btn-ghost text-on-primary ${action.style === "primary" ? "bg-on-primary text-ink hover:opacity-90" : ""}`}
                >
                  {action.label}
                </a>
              ))}
              <OwnerProjectLink projectId={project.id} />
            </div>
          </div>
          <div className="card-dark p-6 backdrop-blur-sm">
            <ProgressBar value={project.progress_percent} color={accent} />
            {project.latest_update && (
              <div className="mt-6 border-t border-hairline-dark pt-5">
                <p className="micro-cap mb-1 text-ink-mute">Останнє оновлення / {formatDate(project.latest_update.published_at)}</p>
                <Link href={`/projects/${project.slug}/updates/${project.latest_update.slug}`} className="text-lg font-bold text-on-primary transition-colors hover:text-on-primary-mute">
                  {project.latest_update.title}
                </Link>
                {project.latest_update.summary && <p className="mt-2 text-sm leading-6 text-on-primary-mute">{project.latest_update.summary}</p>}
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
        {project.pinned_notice_title && (
          <section className="mb-12 border-y border-hairline-dark py-6">
            <p className="micro-cap mb-2 text-ink-mute">Закріплено</p>
            <h2 className="mb-2 text-2xl font-bold uppercase tracking-[0.08em] text-on-primary">{project.pinned_notice_title}</h2>
            {project.pinned_notice_body && <p className="max-w-3xl text-on-primary-mute">{project.pinned_notice_body}</p>}
          </section>
        )}

        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <section>
            <p className="micro-cap mb-2 text-ink-mute">Опис</p>
            <h2 className="heading-section mb-6">Про проєкт</h2>
            <div className="prose prose-invert max-w-none text-on-primary-mute">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {project.full_description_markdown || project.short_description}
              </ReactMarkdown>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {(project.tags || []).map((tag) => (
                <span key={tag} className="caption rounded border border-hairline-dark px-2 py-1 text-ink-mute">#{tag}</span>
              ))}
            </div>
          </section>

          <section>
            <p className="micro-cap mb-2 text-ink-mute">Прогрес-сектори</p>
            <h2 className="heading-section mb-6">Стан</h2>
            <ProgressTree sections={project.sections} color={accent} />
          </section>
        </div>

        {project.gallery.length > 0 && (
          <section className="mt-16">
            <p className="micro-cap mb-2 text-ink-mute">Галерея</p>
            <h2 className="heading-section mb-6">Матеріали</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {project.gallery.map((item) => (
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

        <section className="mt-16">
          <p className="micro-cap mb-2 text-ink-mute">Оновлення</p>
          <h2 className="heading-section mb-6">Devlog</h2>
          <ProjectUpdateList projectSlug={project.slug} updates={project.updates} />
        </section>
      </main>
    </div>
  );
}
