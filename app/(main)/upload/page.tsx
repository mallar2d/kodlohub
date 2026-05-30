"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UploadPage() {
  const router = useRouter();
  const [user, setUser] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploadType, setUploadType] = useState<"image" | "video" | "document" | "post">("image");
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postTags, setPostTags] = useState("");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        setUser(data.user);
      }
      setLoading(false);
    });
  }, [supabase, router]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (f: File) => {
    if (f.size > 100 * 1024 * 1024) {
      alert("Файл занадто великий! Максимум 100 МБ.");
      return;
    }

    setFile(f);

    if (f.type.startsWith("image/")) {
      setUploadType("image");
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else if (f.type.startsWith("video/")) {
      setUploadType("video");
      setPreview(null);
    } else {
      setUploadType("document");
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (uploadType === "post") {
      // Text post
      if (!postTitle || !postContent) return;
      setUploading(true);

      const userId = (user as { id: string }).id;

      // Ensure profile exists
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single();

      if (!existing) {
        const meta = (user as { user_metadata?: Record<string, string> }).user_metadata || {};
        await supabase.from("profiles").upsert({
          id: userId,
          username: meta.email?.split("@")[0] || `user_${userId.slice(0, 8)}`,
          display_name: meta.full_name || meta.name || "Учасник кодла",
          avatar_url: meta.avatar_url || meta.picture || null,
          bio: "",
        }, { onConflict: "id" });
      }

      const { error } = await supabase.from("posts").insert({
        author_id: userId,
        title: postTitle,
        content: postContent,
        tags: postTags.split(",").map((t) => t.trim()).filter(Boolean),
        type: "blog",
      });

      if (!error) {
        router.push("/blog");
      }
      setUploading(false);
      return;
    }

    if (!file) return;

    // Vercel free tier body size limit is 4.5 MB
    if (file.size > 4.5 * 1024 * 1024) {
      alert(`Файл занадто великий для Vercel (${(file.size / 1024 / 1024).toFixed(1)} МБ). Максимум ~4.5 МБ.`);
      return;
    }

    setUploading(true);
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    // Upload via API route → Cloudflare R2
    const formData = new FormData();
    formData.append("file", file);
    formData.append("authorId", (user as { id: string }).id);
    formData.append("caption", caption);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();

    clearInterval(progressInterval);

    if (!res.ok) {
      console.error("Upload error:", data.error);
      alert(`Помилка завантаження: ${data.error || "Невідома помилка"}`);
      setUploading(false);
      return;
    }

    setProgress(100);

    if (data.success) {
      router.push("/gallery");
    }

    setUploading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="micro-cap text-ink-mute mb-2">ДОДАВАЙ КОНТЕНТ</p>
          <h1 className="heading-section mb-4">ЗАВАНТАЖИТИ ПОДРО</h1>
          <p className="text-on-primary-mute text-lg">
            Завантажуй фото, відео, документи або пиши пости для кодла
          </p>
        </div>

        {/* Type selector */}
        <div className="flex flex-wrap gap-3 mb-8">
          {(["image", "video", "document", "post"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setUploadType(type)}
              className={`button-cap px-4 py-2 rounded-full border transition-opacity ${
                uploadType === type
                  ? "border-on-primary text-on-primary"
                  : "border-hairline-dark text-ink-mute hover:text-on-primary"
              }`}
            >
              {type === "image"
                ? "ФОТО"
                : type === "video"
                ? "ВІДЕО"
                : type === "document"
                ? "ДОКУМЕНТ"
                : "ПОСТ"}
            </button>
          ))}
        </div>

        {uploadType === "post" ? (
          /* Post form */
          <div className="space-y-6">
            <div>
              <label className="micro-cap text-on-primary-mute block mb-2">
                ЗАГОЛОВОК
              </label>
              <input
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Напиши щось крутєве..."
                className="w-full px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute"
              />
            </div>

            <div>
              <label className="micro-cap text-on-primary-mute block mb-2">
                КОНТЕНТ (MARKDOWN)
              </label>
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Пиши тут. Підтримується Markdown."
                rows={12}
                className="w-full px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute resize-none"
              />
            </div>

            <div>
              <label className="micro-cap text-on-primary-mute block mb-2">
                ТЕГИ (ЧЕРЕЗ КОМУ)
              </label>
              <input
                type="text"
                value={postTags}
                onChange={(e) => setPostTags(e.target.value)}
                placeholder="подро, кодло, меми"
                className="w-full px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute"
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={!postTitle || !postContent || uploading}
              className="btn-ghost text-on-primary disabled:opacity-30"
            >
              {uploading ? "НАЖИВАЄМО..." : "ОПУБЛІКУВАТИ"}
            </button>
          </div>
        ) : (
          /* File upload */
          <>
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
                dragActive
                  ? "border-on-primary bg-on-primary/5"
                  : "border-hairline-dark hover:border-on-primary-mute"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf,.txt,.md"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />

              {preview ? (
                <img
                  src={preview}
                  alt="Превʼю"
                  className="max-h-64 mx-auto rounded-lg"
                />
              ) : file ? (
                <div>
                  <p className="text-on-primary font-bold mb-2">{file.name}</p>
                  <p className="caption text-ink-mute">
                    {(file.size / 1024 / 1024).toFixed(1)} МБ
                  </p>
                </div>
              ) : (
                <div>
                  <svg
                    className="w-12 h-12 mx-auto text-ink-mute mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 6v12m6-6H6"
                    />
                  </svg>
                  <p className="text-on-primary mb-2">
                    НАЖМИ І ЗАВАНТАЖ ПОДРО
                  </p>
                  <p className="caption text-ink-mute">
                    Перетягни файл сюди або клікни. Максимум 100 МБ.
                  </p>
                </div>
              )}
            </div>

            {/* Caption */}
            {file && (
              <div className="mt-6">
                <label className="micro-cap text-on-primary-mute block mb-2">
                  ПІДПИС
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Опиши що це..."
                  className="w-full px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute"
                />
              </div>
            )}

            {/* Progress bar */}
            {uploading && (
              <div className="mt-6">
                <div className="h-1 bg-canvas-night-soft rounded-full overflow-hidden">
                  <div
                    className="h-full bg-on-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="micro-cap text-ink-mute mt-2 text-center">
                  ЗАВАНТАЖУЄМО... {progress}%
                </p>
              </div>
            )}

            {/* Upload button */}
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="btn-ghost text-on-primary disabled:opacity-30 mt-6"
            >
              {uploading ? "НАЖИВАЄМО..." : "НАЖАТИ"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
