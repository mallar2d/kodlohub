"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";

interface Comment {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  profiles?: { display_name: string; username: string; avatar_url: string | null } | null;
}

export default function MediaComments({ mediaId }: { mediaId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    fetch(`/api/media_comments?mediaId=${mediaId}`)
      .then((res) => res.json())
      .then((data) => {
        setComments(data.comments || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [mediaId]);

  const handleSubmit = async () => {
    if (!text.trim() || !user || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/media_comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, content: text }),
      });

      if (res.ok) {
        const { comment } = await res.json();
        setComments([...comments, comment]);
        setText("");
      }
    } catch (err) {
      console.error("Comment error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Видалити коментар?")) return;

    try {
      const res = await fetch("/api/media_comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });

      if (res.ok) {
        setComments(comments.filter((c) => c.id !== commentId));
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-hairline-dark">
      <p className="micro-cap text-ink-mute mb-3">КОМЕНТАРІ ({comments.length})</p>

      {loading || authLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full mx-auto" />
        </div>
      ) : (
        <>
          {user ? (
            <div className="mb-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Напиши коментар..."
                rows={2}
                className="w-full px-3 py-2 bg-canvas-night border border-hairline-dark rounded text-on-primary text-sm placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute resize-none mb-2"
              />
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || submitting}
                className="button-cap px-3 py-1 rounded bg-on-primary/10 text-on-primary text-xs disabled:opacity-30"
              >
                {submitting ? "НАДІСЛАТИ..." : "НАДІСЛАТИ"}
              </button>
            </div>
          ) : (
            <p className="text-on-primary-mute text-xs mb-4">
              <Link href="/login" className="text-on-primary hover:underline">Увійди</Link>, щоб коментувати.
            </p>
          )}

          <div className="space-y-3 max-h-60 overflow-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                <Avatar
                  src={comment.profiles?.avatar_url}
                  displayName={comment.profiles?.display_name || "Учасник"}
                  size={24}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-on-primary">
                      {comment.profiles?.display_name || "Учасник"}
                    </span>
                    <span className="text-[10px] text-ink-mute">
                      {new Date(comment.created_at).toLocaleString("uk-UA")}
                    </span>
                    {user && user.id === comment.author_id && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="text-[10px] text-ink-mute hover:text-red-400 transition-colors ml-auto"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-on-primary-mute whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-xs text-ink-mute text-center py-2">Поки коментарів немає</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
