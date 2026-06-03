"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MarkdownEditor from "@/components/ui/MarkdownEditor";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { wikiCategoryIcons } from "@/lib/wiki-icons";

interface WikiCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface WikiArticle {
  id: string;
  slug: string;
  title: string;
  content: string;
  category_id: string | null;
  is_published: boolean;
  is_featured: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function WikiEditorClient({
  categories,
  article,
  initialCategory,
}: {
  categories: WikiCategory[];
  article: WikiArticle | null;
  initialCategory: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [title, setTitle] = useState(article?.title || "");
  const [content, setContent] = useState(article?.content || "");
  const [categoryId, setCategoryId] = useState<string>(
    article?.category_id || categories.find((c) => c.slug === initialCategory)?.id || ""
  );
  const [editComment, setEditComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      if (!profile || (profile.role !== "owner" && profile.role !== "podrofikovany")) {
        router.push("/wiki");
      }
    });
  }, [router, supabase]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast("Введіть заголовок", "error");
      return;
    }
    if (!content.trim()) {
      toast("Введіть контент", "error");
      return;
    }

    setSaving(true);
    try {
      const slug = slugify(title);

      if (article) {
        const res = await fetch(`/api/wiki/articles/${article.slug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content,
            category_id: categoryId || null,
            edit_comment: editComment || "Оновлено",
            new_slug: slug !== article.slug ? slug : undefined,
          }),
        });
        if (!res.ok) throw new Error("Failed to update");
        toast("Статтю оновлено", "success");
        router.push(`/wiki/${categories.find((c) => c.id === categoryId)?.slug || "general"}/${slug}`);
      } else {
        const selectedCat = categories.find((c) => c.id === categoryId);
        const res = await fetch("/api/wiki/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            slug,
            content,
            category_id: categoryId || null,
            edit_comment: editComment || "Перша версія",
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create");
        }
        toast("Статтю створено", "success");
        router.push(`/wiki/${selectedCat?.slug || "general"}/${slug}`);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Помилка при збереженні", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-8">
          <Link href="/wiki" className="micro-cap text-ink-mute hover:text-on-primary transition-colors">
            КОДЛОПЕДІЯ
          </Link>
          <span className="text-ink-mute">/</span>
          <span className="micro-cap text-on-primary">
            {article ? "РЕДАГУВАННЯ" : "НОВА СТАТТЯ"}
          </span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="heading-section mb-4">
            {article ? "РЕДАГУВАННЯ СТАТТІ" : "НОВА СТАТТЯ"}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          {/* Main editor */}
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="micro-cap text-ink-mute mb-2 block">ЗАГОЛОВОК</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Назва статті..."
                className="w-full px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute text-lg"
              />
            </div>

            {/* Content */}
            <div>
              <label className="micro-cap text-ink-mute mb-2 block">КОНТЕНТ</label>
              <MarkdownEditor
                value={content}
                onChange={setContent}
                placeholder="Пиши статтю тут. Підтримується Markdown."
                rows={20}
                onUploadError={(msg) => toast(msg, "error")}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Category */}
            <div className="card-dark p-4">
              <label className="micro-cap text-ink-mute mb-3 block">КАТЕГОРІЯ</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(categoryId === cat.id ? "" : cat.id)}
                    className={`button-cap px-3 py-1.5 rounded-full border transition-opacity inline-flex items-center gap-1.5 text-[11px] ${
                      categoryId === cat.id
                        ? "border-on-primary text-on-primary"
                        : "border-hairline-dark text-ink-mute hover:text-on-primary"
                    }`}
                  >
                    <span className="inline-flex">{wikiCategoryIcons[cat.slug] || wikiCategoryIcons.general}</span>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Edit comment */}
            <div className="card-dark p-4">
              <label className="micro-cap text-ink-mute mb-3 block">КОМЕНТАР ДО ЗМІНИ</label>
              <textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Що було змінено..."
                rows={3}
                className="w-full px-3 py-2 bg-canvas-night border border-hairline-dark rounded text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute resize-none text-sm"
              />
            </div>

            {/* Actions */}
            <div className="card-dark p-4 space-y-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-ghost text-on-primary w-full"
              >
                {saving ? "ЗБЕРЕЖЕННЯ..." : article ? "ЗБЕРЕГТИ ЗМІНИ" : "СТВОРИТИ СТАТТЮ"}
              </button>
              <Link
                href={
                  article
                    ? `/wiki/${categories.find((c) => c.id === article.category_id)?.slug || "general"}/${article.slug}`
                    : "/wiki"
                }
                className="btn-ghost text-ink-mute w-full text-center block"
              >
                СКАСУВАТИ
              </Link>
            </div>

            {/* Slug preview */}
            {title && (
              <div className="card-dark p-4">
                <label className="micro-cap text-ink-mute mb-2 block">URL</label>
                <p className="caption text-on-primary-mute font-mono break-all">
                  /wiki/{categories.find((c) => c.id === categoryId)?.slug || "category"}/{slugify(title)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
