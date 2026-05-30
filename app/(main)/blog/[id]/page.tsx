"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

interface Post {
  id: string;
  title: string;
  content: string;
  tags: string[];
  type: string;
  created_at: string;
  author_id: string;
  profiles?: { display_name: string; username: string; avatar_url: string | null };
}

export default function BlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthor, setIsAuthor] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function fetchPost() {
      const { data: { user } } = await supabase.auth.getUser();

      const { data } = await supabase
        .from("posts")
        .select("*, profiles(display_name, username, avatar_url)")
        .eq("id", params.id)
        .single();

      if (data) {
        setPost(data);
        setEditTitle(data.title);
        setEditContent(data.content);
        setEditTags(data.tags?.join(", ") || "");
        if (user && user.id === data.author_id) setIsAuthor(true);
      }

      setLoading(false);
    }

    fetchPost();
  }, [params.id, supabase]);

  const handleSave = async () => {
    if (!post) return;

    const { error } = await supabase
      .from("posts")
      .update({
        title: editTitle,
        content: editContent,
        tags: editTags.split(",").map((t) => t.trim()).filter(Boolean),
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (!error) {
      setPost({ ...post, title: editTitle, content: editContent, tags: editTags.split(",").map((t) => t.trim()).filter(Boolean) });
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!post || !confirm("Видалити пост? Це незворотньо.")) return;

    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (!error) router.push("/blog");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="heading-sub text-hairline-dark mb-4">:(</p>
          <p className="text-on-primary-mute">
            брєдік в чат нє пішем — пост не знайдено
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <article className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="button-cap px-3 py-1 rounded-full border border-hairline-dark text-on-primary-mute">
              {post.type === "blog"
                ? "БЛОГ"
                : post.type === "lore"
                ? "АРТЕФАКТИ"
                : "ПОДІЯ"}
            </span>
            <span className="caption text-ink-mute">
              {new Date(post.created_at).toLocaleDateString("uk-UA")}
            </span>
          </div>

          {editing ? (
            <div className="space-y-4 mb-6">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary focus:outline-none focus:border-on-primary-mute text-2xl font-bold"
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={15}
                className="w-full px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary focus:outline-none focus:border-on-primary-mute resize-none"
              />
              <input
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="Теги через кому"
                className="w-full px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute"
              />
              <div className="flex gap-3">
                <button onClick={handleSave} className="btn-ghost text-on-primary">ЗБЕРЕГТИ</button>
                <button onClick={() => setEditing(false)} className="btn-ghost text-ink-mute border-hairline-dark">СКАСУВАТИ</button>
              </div>
            </div>
          ) : (
            <h1 className="heading-sub mb-6">{post.title}</h1>
          )}

          <div className="flex items-center justify-between">
            {post.profiles && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-canvas-cool flex items-center justify-center text-ink font-bold overflow-hidden">
                  {post.profiles.avatar_url ? (
                    <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    post.profiles.display_name?.charAt(0) || "?"
                  )}
                </div>
                <div>
                  <Link href={`/profile/${post.author_id}`} className="font-bold text-on-primary hover:text-on-primary-mute transition-colors">
                    {post.profiles.display_name}
                  </Link>
                  <p className="caption text-ink-mute">
                    @{post.profiles.username}
                  </p>
                </div>
              </div>
            )}

            {isAuthor && !editing && (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(true)}
                  className="button-cap px-3 py-1 rounded-full border border-hairline-dark text-ink-mute hover:text-on-primary hover:border-on-primary transition-colors"
                >
                  РЕДАГУВАТИ
                </button>
                <button
                  onClick={handleDelete}
                  className="button-cap px-3 py-1 rounded-full border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  ВИДАЛИТИ
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {!editing && (
          <div className="prose prose-invert prose-lg max-w-none">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && !editing && (
          <div className="mt-12 pt-8 border-t border-hairline-dark">
            <p className="micro-cap text-ink-mute mb-3">ТЕГИ</p>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="button-cap px-3 py-1 rounded-full border border-hairline-dark text-on-primary-mute"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
