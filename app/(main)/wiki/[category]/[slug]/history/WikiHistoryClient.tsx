"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface WikiRevision {
  id: string;
  article_id: string;
  content: string;
  title: string;
  edit_comment: string;
  created_at: string;
  profiles?: { display_name: string; username: string } | null;
}

interface WikiArticle {
  id: string;
  slug: string;
  title: string;
  category_id: string | null;
  wiki_categories?: { name: string; slug: string; icon: string } | null;
}

export default function WikiHistoryClient({
  article,
  revisions,
  categorySlug,
}: {
  article: WikiArticle;
  revisions: WikiRevision[];
  categorySlug: string;
}) {
  const [selectedRevision, setSelectedRevision] = useState<WikiRevision | null>(null);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-8">
          <Link href="/wiki" className="micro-cap text-ink-mute hover:text-on-primary transition-colors">
            КОДЛОПЕДІЯ
          </Link>
          <span className="text-ink-mute">/</span>
          <Link
            href={`/wiki/${categorySlug}`}
            className="micro-cap text-ink-mute hover:text-on-primary transition-colors"
          >
            {article.wiki_categories?.icon} {article.wiki_categories?.name}
          </Link>
          <span className="text-ink-mute">/</span>
          <Link
            href={`/wiki/${categorySlug}/${article.slug}`}
            className="micro-cap text-ink-mute hover:text-on-primary transition-colors"
          >
            {article.title}
          </Link>
          <span className="text-ink-mute">/</span>
          <span className="micro-cap text-on-primary">ІСТОРІЯ</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="heading-section mb-4">ІСТОРІЯ ЗМІН</h1>
          <p className="text-on-primary-mute">
            {article.title} — {revisions.length} версій
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          {/* Revision list */}
          <div>
            {revisions.length === 0 ? (
              <div className="card-dark p-8 text-center">
                <p className="text-on-primary-mute">Історія порожня</p>
              </div>
            ) : (
              <div className="space-y-3">
                {revisions.map((revision, index) => (
                  <button
                    key={revision.id}
                    onClick={() => setSelectedRevision(revision)}
                    className={`card-dark p-4 w-full text-left hover:border-on-primary-mute transition-colors ${
                      selectedRevision?.id === revision.id
                        ? "border-on-primary"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {index === 0 && (
                          <span className="button-cap px-2 py-0.5 rounded border border-green-500/50 text-green-400 text-[10px]">
                            ПОТОЧНА
                          </span>
                        )}
                        <span className="button-cap text-on-primary text-sm">
                          Версія {revisions.length - index}
                        </span>
                      </div>
                      <span className="caption text-ink-mute">
                        {new Date(revision.created_at).toLocaleString("uk-UA")}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      {revision.profiles && (
                        <span className="caption text-ink-mute">
                          {revision.profiles.display_name}
                        </span>
                      )}
                      {revision.edit_comment && (
                        <span className="caption text-on-primary-mute italic truncate">
                          «{revision.edit_comment}»
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Revision preview */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="card-dark p-4">
              <h3 className="micro-cap text-ink-mute mb-4">ПЕРЕГЛЯД ВЕРСІЇ</h3>
              {selectedRevision ? (
                <div>
                  <div className="mb-3 pb-3 border-b border-hairline-dark">
                    <p className="button-cap text-on-primary text-sm">
                      {selectedRevision.title}
                    </p>
                    <p className="caption text-ink-mute mt-1">
                      {selectedRevision.profiles?.display_name} —{" "}
                      {new Date(selectedRevision.created_at).toLocaleString("uk-UA")}
                    </p>
                    {selectedRevision.edit_comment && (
                      <p className="caption text-on-primary-mute italic mt-1">
                        «{selectedRevision.edit_comment}»
                      </p>
                    )}
                  </div>
                  <div className="prose text-sm max-h-[500px] overflow-auto">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedRevision.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <p className="caption text-ink-mute text-center py-8">
                  Оберіть версію для перегляду
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
