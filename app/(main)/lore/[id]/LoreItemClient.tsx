"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import Image from "next/image";

interface LoreItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  media_id: string | null;
  author_id: string;
  created_at: string;
  profiles?: { display_name: string; username: string; avatar_url: string | null } | null;
  media?: { id: string; file_url: string; file_type: string; file_size: number | null; caption: string | null } | null;
}

const categoryLabels: Record<string, string> = {
  person: "ЛЮДИНА",
  event: "ПОДІЯ",
  artifact: "АРТЕФАКТ",
  meme: "МЕМ",
  quote: "ЦИТАТА",
};

const categoryColors: Record<string, string> = {
  person: "border-blue-500/50 text-blue-400",
  event: "border-green-500/50 text-green-400",
  artifact: "border-yellow-500/50 text-yellow-400",
  meme: "border-purple-500/50 text-purple-400",
  quote: "border-pink-500/50 text-pink-400",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Б";
  const k = 1024;
  const sizes = ["Б", "КБ", "МБ", "ГБ"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function MarkdownFileViewer({ url, isMarkdown }: { url: string; isMarkdown: boolean }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((buf) => {
        const text = new TextDecoder("utf-8").decode(buf);
        setContent(text);
        setLoading(false);
      })
      .catch(() => {
        setContent("Помилка завантаження файлу");
        setLoading(false);
      });
  }, [url]);

  if (loading)
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-on-primary border-t-transparent rounded-full mx-auto" />
      </div>
    );
  if (!content) return null;

  return (
    <div className="bg-canvas-night-soft rounded-lg p-6 overflow-auto max-h-[600px]">
      {isMarkdown ? (
        <div className="whitespace-pre-wrap text-on-primary leading-relaxed">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      ) : (
        <pre className="text-on-primary text-sm whitespace-pre-wrap font-mono">{content}</pre>
      )}
    </div>
  );
}

export default function LoreItemClient({ item }: { item: LoreItem }) {
  const router = useRouter();
  const [canDelete, setCanDelete] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }: { data: { user: any } }) => {
      if (!data.user) return;
      const isItemAuthor = data.user.id === item.author_id;
      if (isItemAuthor) {
        setCanDelete(true);
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        setCanDelete(profile?.role === "owner" || profile?.role === "podrofikovany");
      }
    });
  }, [item.author_id, supabase]);

  const handleDelete = async () => {
    if (!confirm("Видалити артефакт?")) return;
    const { error: loreError } = await supabase.from("lore_items").delete().eq("id", item.id);
    if (loreError) {
      alert(`Помилка: ${loreError.message}`);
      return;
    }
    if (item.media_id) {
      await supabase.from("media").delete().eq("id", item.media_id);
    }
    router.push("/lore");
  };

  const fileExt = item.media?.file_url.split(".").pop()?.toLowerCase() || "";
  const isMarkdown = ["md", "markdown"].includes(fileExt);
  const isText = ["txt", "json", "xml", "csv", "log", "py", "js", "ts", "html", "css", "md"].includes(fileExt);
  const isPdf = fileExt === "pdf";
  const isAudio = item.media?.file_type === "audio" || ["mp3", "wav", "ogg", "flac", "aac"].includes(fileExt);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/lore" className="micro-cap text-ink-mute hover:text-on-primary mb-6 inline-block">
          ← НАЗАД ДО АРХІВУ
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className={`button-cap px-3 py-1 rounded-full border ${categoryColors[item.category] || "border-hairline-dark text-ink-mute"}`}>
              {categoryLabels[item.category] || item.category}
            </span>
            <span className="caption text-ink-mute">{new Date(item.created_at).toLocaleDateString("uk-UA")}</span>
          </div>

          <h1 className="heading-sub mb-4">{item.title}</h1>

          <div className="flex items-center justify-between">
            {item.profiles && (
              <Link href={`/profile/${item.author_id}`} className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-full bg-canvas-cool flex items-center justify-center text-ink font-bold overflow-hidden relative">
                  {item.profiles.avatar_url ? (
                    <Image src={item.profiles.avatar_url} alt="" fill className="object-cover rounded-full" sizes="40px" />
                  ) : (
                    item.profiles.display_name?.charAt(0) || "?"
                  )}
                </div>
                <div>
                  <p className="font-bold text-on-primary group-hover:text-on-primary-mute transition-colors">{item.profiles.display_name}</p>
                  <p className="caption text-ink-mute">@{item.profiles.username}</p>
                </div>
              </Link>
            )}

            {canDelete && (
              <button
                onClick={handleDelete}
                className="button-cap px-3 py-1 rounded-full border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                ВИДАЛИТИ
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        {item.description && (
          <div className="mb-8">
            <div className="whitespace-pre-wrap text-on-primary leading-relaxed">
              <ReactMarkdown>{item.description}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Media file */}
        {item.media && (
          <div className="mb-8">
            <h2 className="micro-cap text-ink-mute mb-4">ФАЙЛ</h2>
            <div className="card-dark p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-on-primary">{item.media.file_url.split("/").pop()}</p>
                  {item.media.file_size && <p className="caption text-ink-mute">{formatBytes(item.media.file_size)}</p>}
                </div>
                <a href={item.media.file_url} download target="_blank" rel="noopener noreferrer" className="btn-ghost text-on-primary">
                  СКАЧАТИ
                </a>
              </div>

              {item.media.file_type === "image" && (
                <div className="relative w-full max-h-[600px]">
                  <Image src={item.media.file_url} alt={item.title} width={1200} height={800} className="max-w-full max-h-[600px] object-contain rounded-lg mx-auto" sizes="(max-width: 768px) 100vw, 80vw" priority />
                </div>
              )}

              {item.media.file_type === "video" && (
                <video src={item.media.file_url} controls className="max-w-full max-h-[600px] mx-auto rounded-lg" />
              )}

              {isAudio && <audio src={item.media.file_url} controls className="w-full" />}

              {isPdf && <iframe src={item.media.file_url} className="w-full h-[600px] rounded-lg border border-hairline-dark" />}

              {(isMarkdown || isText) && !isPdf && (
                <MarkdownFileViewer url={item.media.file_url} isMarkdown={isMarkdown} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
