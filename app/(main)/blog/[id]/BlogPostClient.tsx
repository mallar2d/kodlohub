"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import Image from "next/image";
import LikeButton from "@/components/ui/LikeButton";
import { useToast } from "@/components/ui/Toast";
import MarkdownEditor from "@/components/ui/MarkdownEditor";
import Avatar from "@/components/ui/Avatar";
import type { User } from "@supabase/supabase-js";

interface Post {
  id: string;
  title: string;
  content: string;
  tags: string[] | null;
  type: string;
  created_at: string;
  author_id: string;
  profiles?: { display_name: string; username: string; avatar_url: string | null } | null;
}

interface Comment {
  id: string;
  content: string;
  author_id: string;
  post_id: string;
  created_at: string;
  profiles?: { display_name: string; username: string; avatar_url: string | null } | null;
}

export default function BlogPostClient({
  post: initialPost,
  initialComments,
}: {
  post: Post;
  initialComments: Comment[];
}) {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [isAuthor, setIsAuthor] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(initialPost.title);
  const [editContent, setEditContent] = useState(initialPost.content);
  const [editTags, setEditTags] = useState(initialPost.tags?.join(", ") || "");
  const [user, setUser] = useState<User | null>(null);
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: any } }) => {
      setUser(data.user);
      if (data.user && data.user.id === initialPost.author_id) setIsAuthor(true);
    });
  }, [initialPost.author_id, supabase]);

  const handleSave = async () => {
    const { error } = await supabase
      .from("posts")
      .update({
        title: editTitle,
        content: editContent,
        tags: editTags.split(",").map((t) => t.trim()).filter(Boolean),
        updated_at: new Date().toISOString(),
      })
      .eq("id", initialPost.id);
    if (!error) {
      window.location.reload();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Видалити пост? Це незворотньо.")) return;
    const { error } = await supabase.from("posts").delete().eq("id", initialPost.id);
    if (!error) router.push("/blog");
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !user) return;
    setSubmitting(true);

    const { data: newComment, error } = await supabase
      .from("comments")
      .insert({ post_id: initialPost.id, author_id: user.id, content: commentText })
      .select("*, profiles(display_name, username, avatar_url)")
      .single();

    if (!error && newComment) {
      setComments([...comments, newComment]);
      setCommentText("");

      if (initialPost.author_id !== user.id) {
        const { data: authorProfile } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
        await supabase.from("notifications").insert({
          user_id: initialPost.author_id,
          type: "comment",
          title: "Новий коментар",
          message: `${authorProfile?.display_name || "Користувач"} прокоментував "${initialPost.title}"`,
          link: `/blog/${initialPost.id}`,
        });
      }
    }
    setSubmitting(false);
  };

  const handleEditComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;
    const { error } = await supabase.from("comments").update({ content: editCommentText }).eq("id", commentId);
    if (!error) {
      setComments(comments.map((c) => (c.id === commentId ? { ...c, content: editCommentText } : c)));
      setEditingCommentId(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Видалити коментар?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (!error) setComments(comments.filter((c) => c.id !== commentId));
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <article className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="button-cap px-3 py-1 rounded-full border border-hairline-dark text-on-primary-mute">
              {initialPost.type === "blog" ? "БЛОГ" : initialPost.type === "lore" ? "АРТЕФАКТИ" : "ПОДІЯ"}
            </span>
            <span className="caption text-ink-mute">
              {new Date(initialPost.created_at).toLocaleDateString("uk-UA")}
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
              <MarkdownEditor
                value={editContent}
                onChange={setEditContent}
                rows={15}
              />
              <input
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="Теги через кому"
                className="w-full px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute"
              />
              <div className="flex gap-3">
                <button onClick={handleSave} className="btn-ghost text-on-primary">
                  ЗБЕРЕГТИ
                </button>
                <button onClick={() => setEditing(false)} className="btn-ghost text-ink-mute border-hairline-dark">
                  СКАСУВАТИ
                </button>
              </div>
            </div>
          ) : (
            <h1 className="heading-sub mb-6">{initialPost.title}</h1>
          )}

          <div className="flex items-center justify-between">
            {initialPost.profiles && (
              <Link href={`/profile/${initialPost.author_id}`} className="flex items-center gap-3 group">
                <Avatar
                  src={initialPost.profiles.avatar_url}
                  displayName={initialPost.profiles.display_name}
                  size={40}
                />
                <div>
                  <p className="font-bold text-on-primary group-hover:text-on-primary-mute transition-colors">
                    {initialPost.profiles.display_name}
                  </p>
                  <p className="caption text-ink-mute">@{initialPost.profiles.username}</p>
                </div>
              </Link>
            )}
            <div className="flex items-center gap-4">
              <LikeButton itemType="post" itemId={initialPost.id} />
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
        </div>

        {/* Content */}
        {!editing && (
          <div className="mb-12">
            <div className="prose whitespace-pre-wrap text-on-primary leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{initialPost.content}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Tags */}
        {initialPost.tags && initialPost.tags.length > 0 && !editing && (
          <div className="mb-12 pt-8 border-t border-hairline-dark">
            <p className="micro-cap text-ink-mute mb-3">ТЕГИ</p>
            <div className="flex flex-wrap gap-2">
              {initialPost.tags.map((tag: string) => (
                <span key={tag} className="button-cap px-3 py-1 rounded-full border border-hairline-dark text-on-primary-mute">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="border-t border-hairline-dark pt-8">
          <h2 className="heading-sub mb-6">КОМЕНТАРІ ({comments.length})</h2>

          {user ? (
            <div className="mb-8">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Напиши коментар..."
                rows={3}
                className="w-full px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute resize-none mb-3"
              />
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim() || submitting}
                className="btn-ghost text-on-primary disabled:opacity-30"
              >
                {submitting ? "НАДІСЛАТИ..." : "НАДІСЛАТИ"}
              </button>
            </div>
          ) : (
            <p className="text-on-primary-mute mb-8">
              <Link href="/login" className="text-on-primary hover:underline">Увійди</Link>, щоб коментувати.
            </p>
          )}

          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="card-dark p-4">
                <div className="flex items-start justify-between">
                  <Link href={`/profile/${comment.author_id}`} className="flex items-center gap-3 group">
                    <Avatar
                      src={comment.profiles?.avatar_url}
                      displayName={comment.profiles?.display_name}
                      size={32}
                    />
                    <div>
                      <p className="font-bold text-on-primary text-sm group-hover:text-on-primary-mute transition-colors">
                        {comment.profiles?.display_name}
                      </p>
                      <p className="caption text-ink-mute">{new Date(comment.created_at).toLocaleString("uk-UA")}</p>
                    </div>
                  </Link>

                  {user && user.id === comment.author_id && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingCommentId(comment.id);
                          setEditCommentText(comment.content);
                        }}
                        className="p-1 text-ink-mute hover:text-on-primary transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="p-1 text-ink-mute hover:text-red-400 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {editingCommentId === comment.id ? (
                  <div className="mt-3">
                    <textarea
                      value={editCommentText}
                      onChange={(e) => setEditCommentText(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-canvas-night border border-hairline-dark rounded text-on-primary text-sm focus:outline-none focus:border-on-primary-mute resize-none"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleEditComment(comment.id)}
                        className="button-cap px-3 py-1 rounded bg-on-primary/10 text-on-primary text-xs"
                      >
                        ЗБЕРЕГТИ
                      </button>
                      <button
                        onClick={() => setEditingCommentId(null)}
                        className="button-cap px-3 py-1 rounded text-ink-mute text-xs"
                      >
                        СКАСУВАТИ
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-on-primary mt-2 whitespace-pre-wrap">{comment.content}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
