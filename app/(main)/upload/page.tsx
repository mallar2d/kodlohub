"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UploadPage() {
  const router = useRouter();
  const [user, setUser] = useState<unknown>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploadType, setUploadType] = useState<
    "image" | "video" | "document" | "audio" | "post" | "artifact"
  >("image");
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postTags, setPostTags] = useState("");
  const [progress, setProgress] = useState(0);
  const [shemetovanyMode, setShemetovanyMode] = useState<
    "menu" | "post" | "apply"
  >("menu");
  const [applyMessage, setApplyMessage] = useState("");
  const [applySending, setApplySending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }: { data: { user: any } }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }

      setUser(data.user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      setUserRole(profile?.role || "shemetovany");
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

    // Auto-detect preview only, don't override uploadType
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (uploadType === "post") {
      if (!postTitle || !postContent) return;
      setUploading(true);
      const userId = (user as { id: string }).id;

      const { data: existing } = await supabase.from("profiles").select("id").eq("id", userId).single();
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

      let status = "approved";
      if (userRole === "shemetovany") {
        const { count } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId).eq("status", "pending");
        if ((count || 0) >= 3) {
          alert("Вже є 3 пости на розгляді.");
          setUploading(false);
          return;
        }
        status = "pending";
      }

      const { error } = await supabase.from("posts").insert({
        author_id: userId,
        title: postTitle,
        content: postContent,
        tags: postTags.split(",").map((t) => t.trim()).filter(Boolean),
        type: "blog",
        status,
      });

      if (!error) {
        if (status === "pending") {
          const { data: admins } = await supabase.from("profiles").select("id").in("role", ["owner", "podrofikovany"]);
          if (admins) {
            for (const admin of admins) {
              await supabase.from("notifications").insert({
                user_id: admin.id,
                type: "system",
                title: "Новий пост на розгляд",
                message: `Шеметований подав пост "${postTitle}" на апрув`,
                link: "/admin",
              });
            }
          }
          alert("Пост відправлено на розгляд.");
          router.push("/");
        } else {
          router.push("/blog");
        }
      }
      setUploading(false);
      return;
    }

    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      alert("Максимум 100 МБ.");
      return;
    }

    setUploading(true);
    setProgress(10);

    const userId = (user as { id: string }).id;

    // Step 1: Get presigned URL
    setProgress(20);
    const presignRes = await fetch("/api/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        authorId: userId,
      }),
    });

    if (!presignRes.ok) {
      let errorMsg = "Помилка отримання presigned URL";
      try { errorMsg = (await presignRes.json()).error || errorMsg; } catch {}
      alert(errorMsg);
      setUploading(false);
      return;
    }

    const presignData = await presignRes.json();
    setProgress(40);

    // Step 2: Upload directly to R2
    try {
      const uploadRes = await fetch(presignData.presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!uploadRes.ok) {
        alert(`Помилка завантаження в R2: ${uploadRes.status} ${uploadRes.statusText}`);
        setUploading(false);
        return;
      }
    } catch (e) {
      alert(`Помилка мережі: ${e instanceof Error ? e.message : "Невідома помилка"}`);
      setUploading(false);
      return;
    }

    setProgress(70);

    // Step 3: Save to database
    const determineType = () => {
      if (file.type.startsWith("image/")) return "image";
      if (file.type.startsWith("video/")) return "video";
      if (file.type.startsWith("audio/")) return "audio";
      return "document";
    };

    const mediaRes = await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorId: userId,
        fileUrl: presignData.publicUrl,
        fileType: determineType(),
        fileSize: file.size,
        caption: caption || file.name,
      }),
    });

    if (!mediaRes.ok) {
      let errorMsg = "Помилка збереження в БД";
      try { errorMsg = (await mediaRes.json()).error || errorMsg; } catch {}
      alert(errorMsg);
      setUploading(false);
      return;
    }

    const mediaData = await mediaRes.json();
    setProgress(90);

    // Determine if this should go to lore (artifacts)
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const textExts = ["txt", "md", "json", "xml", "csv", "log", "py", "js", "ts", "html", "css"];
    const docExts = ["pdf", "doc", "docx"];
    const musicExts = ["mp3", "wav", "ogg", "flac", "aac"];
    const isArtifact = textExts.includes(ext) || docExts.includes(ext) || musicExts.includes(ext) || file.type.startsWith("audio/");

    if (isArtifact && mediaData.media) {
      await supabase.from("lore_items").insert({
        title: caption || file.name,
        description: `${file.type.startsWith("audio/") ? "Музичний файл" : "Документ"}: ${file.name}`,
        category: "artifact",
        media_id: mediaData.media.id,
        author_id: userId,
      });
    }

    setProgress(100);
    router.push(isArtifact ? "/lore" : "/gallery");
    setUploading(false);
  };

  const handleApplyForKodlo = async () => {
    if (!applyMessage.trim()) return;
    setApplySending(true);

    const userId = (user as { id: string }).id;

    // Check if already has pending request
    const { data: existing } = await supabase
      .from("join_requests")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .single();

    if (existing) {
      alert("Вже є заявка на розгляді. Чекай.");
      setApplySending(false);
      return;
    }

    const { error } = await supabase.from("join_requests").insert({
      user_id: userId,
      message: applyMessage,
    });

    if (!error) {
      // Notify admins
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .in("role", ["owner", "podrofikovany"]);

      if (admins) {
        for (const admin of admins) {
          await supabase.from("notifications").insert({
            user_id: admin.id,
            type: "system",
            title: "Заявка на Кодло",
            message: `Шеметований користувач подав заявку на перехід в Кодло`,
            link: "/admin",
          });
        }
      }

      alert("Заявку відправлено! Чекай на розгляд.");
      router.push("/");
    }

    setApplySending(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (userRole === "shemetovany") {
    if (shemetovanyMode === "post") {
      return (
        <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <button
                onClick={() => setShemetovanyMode("menu")}
                className="micro-cap text-ink-mute hover:text-on-primary mb-4"
              >
                ← НАЗАД
              </button>
              <h1 className="heading-section mb-2">НОВИЙ ПОСТ</h1>
              <p className="caption text-yellow-400">
                Пост піде на розгляд адмінам. Максимум 3 на розгляді.
              </p>
            </div>

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
                {uploading ? "НАЖИМАЄМО..." : "ВІДПРАВИТИ НА РОЗГЛЯД"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (shemetovanyMode === "apply") {
      return (
        <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setShemetovanyMode("menu")}
              className="micro-cap text-ink-mute hover:text-on-primary mb-4"
            >
              ← НАЗАД
            </button>
            <h1 className="heading-section mb-4">ПОДАТИ НА КОДЛО</h1>
            <p className="text-on-primary-mute mb-8">
              Напиши чому ти хочеш стати Кодлом. Адміни розглянуть заявку.
            </p>
            <textarea
              value={applyMessage}
              onChange={(e) => setApplyMessage(e.target.value)}
              placeholder="Я вже довго в кодлі, хочу мати повні права..."
              rows={6}
              className="w-full px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute resize-none mb-6"
            />
            <button
              onClick={handleApplyForKodlo}
              disabled={!applyMessage.trim() || applySending}
              className="btn-ghost text-purple-400 border-purple-500/50 disabled:opacity-30"
            >
              {applySending ? "ВІДПРАВЛЯЄМО..." : "ВІДПРАВИТИ ЗАЯВКУ"}
            </button>
          </div>
        </div>
      );
    }

    // Menu mode
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="heading-sub text-hairline-dark mb-4">ШЕМЕТОВАНИЙ</p>
          <p className="text-on-primary-mute text-lg mb-4">
            Ти можеш постити, але пости йдуть на розгляд адмінам.
          </p>
          <p className="text-on-primary-mute mb-2">
            Максимум 3 пости на розгляд за раз.
          </p>
          <p className="text-on-primary-mute mb-8">
            Щоб отримати повні права — подай заявку на Кодло.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setShemetovanyMode("post");
              }}
              className="btn-ghost text-on-primary"
            >
              НАПИСАТИ ПОСТ
            </button>
            <button
              onClick={() => setShemetovanyMode("apply")}
              className="btn-ghost text-purple-400 border-purple-500/50"
            >
              ПОДАТИ НА КОДЛО
            </button>
            <button
              onClick={() => router.push("/")}
              className="btn-ghost text-ink-mute border-hairline-dark"
            >
              НА ГОЛОВНУ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
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
          {(
            ["image", "video", "document", "audio", "post", "artifact"] as const
          ).map((type) => (
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
                    : type === "audio"
                      ? "МУЗИКА"
                      : type === "artifact"
                        ? "АРТЕФАКТ"
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
              {uploading ? "НАЖИМАЄМО..." : "ОПУБЛІКУВАТИ"}
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
                onChange={(e) =>
                  e.target.files?.[0] && handleFile(e.target.files[0])
                }
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
                  <p className="text-on-primary mb-2">НАЖМИ І ЗАВАНТАЖ ПОДРО</p>
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
              {uploading ? "НАЖИМАЄМО..." : "НАЖАТИ"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
