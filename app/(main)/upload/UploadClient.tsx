"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import MarkdownEditor from "@/components/ui/MarkdownEditor";
import type { User } from "@supabase/supabase-js";

const MAX_FILES_PER_UPLOAD = 10;
const MAX_FILE_SIZE = 100 * 1024 * 1024;

type PresignedUpload = {
  presignedUrl: string;
  publicUrl: string;
};

export default function UploadClient({ initialUser, initialUserRole }: { initialUser: User; initialUserRole: string }) {
  const router = useRouter();
  const user = initialUser;
  const userRole = initialUserRole;
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
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
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  useEffect(() => {
    setIsMobile(
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) || window.innerWidth < 768,
    );
  }, []);

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

    if (e.dataTransfer.files) {
      const availableSlots = MAX_FILES_PER_UPLOAD - files.length;
      const validFiles = Array.from(e.dataTransfer.files).filter((f) => f.size <= MAX_FILE_SIZE);
      const newFiles = validFiles.slice(0, Math.max(availableSlots, 0));
      if (validFiles.length < e.dataTransfer.files.length) {
        toast("Деякі файли перевищують 100 МБ і пропущені.", "error");
      }
      if (newFiles.length < validFiles.length) {
        toast(`Максимум ${MAX_FILES_PER_UPLOAD} файлів за одне завантаження.`, "error");
      }
      setFiles((prev) => [...prev, ...newFiles]);
      if (newFiles.length > 0 && newFiles[0].type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => setPreview(ev.target?.result as string);
        reader.readAsDataURL(newFiles[0]);
      }
    }
  };

  const handleFile = (f: File) => {
    if (files.length >= MAX_FILES_PER_UPLOAD) {
      toast(`Максимум ${MAX_FILES_PER_UPLOAD} файлів за одне завантаження.`, "error");
      return;
    }

    if (f.size > MAX_FILE_SIZE) {
      toast("Файл занадто великий! Максимум 100 МБ.", "error");
      return;
    }

    setFiles((prev) => [...prev, f]);

    if (f.type.startsWith("image/") && !preview) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (uploadType === "post") {
      if (!postTitle || !postContent) return;
      setUploading(true);
      const postRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: postTitle,
          content: postContent,
          tags: postTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      if (!postRes.ok) {
        let errorMsg = "Не вдалося відправити пост.";
        try { errorMsg = (await postRes.json()).error || errorMsg; } catch {}
        toast(errorMsg, "error");
        setUploading(false);
        return;
      }

      const postData = await postRes.json() as { status: "pending" | "approved" };
      if (postData.status === "pending") {
        toast("Пост відправлено на розгляд.", "success");
        router.push("/");
      } else {
        router.push("/blog");
      }
      setUploading(false);
      return;
    }

    if (files.length === 0) return;
    setUploading(true);
    setProgress(0);

    const userId = user.id;
    const totalFiles = files.length;

    const validFiles = files.filter((f) => f.size <= MAX_FILE_SIZE).slice(0, MAX_FILES_PER_UPLOAD);

    if (validFiles.length < files.length) {
      toast(`Частину файлів пропущено: максимум ${MAX_FILES_PER_UPLOAD} файлів і 100 МБ на файл.`, "error");
    }

    const presignRes = await fetch("/api/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorId: userId,
        files: validFiles.map((f) => ({
          fileName: f.name,
          fileType: f.type || "application/octet-stream",
          fileSize: f.size,
        })),
      }),
    });

    if (!presignRes.ok) {
      let errorMsg = "Помилка отримання presigned URL";
      try { errorMsg = (await presignRes.json()).error || errorMsg; } catch {}
      toast(errorMsg, "error");
      setUploading(false);
      return;
    }

    const presignData = await presignRes.json() as { uploads: PresignedUpload[] };
    const uploadedFiles: { file: File; publicUrl: string }[] = [];

    for (const [index, f] of validFiles.entries()) {
      const baseProgress = (index / totalFiles) * 80;
      const fileWeight = 80 / totalFiles;
      const upload = presignData.uploads[index];

      if (!upload) {
        toast(`Не отримано URL для ${f.name}.`, "error");
        continue;
      }

      setProgress(Math.round(baseProgress));

      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round(baseProgress + fileWeight * (e.loaded / e.total));
              setProgress(pct);
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`R2 ${xhr.status}`));
          };
          xhr.onerror = () => reject(new Error("Мережева помилка"));
          xhr.open("PUT", upload.presignedUrl);
          xhr.setRequestHeader("Content-Type", f.type || "application/octet-stream");
          xhr.send(f);
        });
        uploadedFiles.push({ file: f, publicUrl: upload.publicUrl });
      } catch (e) {
        toast(`Помилка завантаження ${f.name}: ${e instanceof Error ? e.message : "Невідома помилка"}`, "error");
        continue;
      }
    }

    if (uploadedFiles.length === 0) {
      setUploading(false);
      return;
    }

    const determineType = (f: File) => {
        if (f.type.startsWith("image/")) return "image";
        if (f.type.startsWith("video/")) return "video";
        if (f.type.startsWith("audio/")) return "audio";
        return "document";
    };

    setProgress(85);

    const mediaRes = await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorId: userId,
        media: uploadedFiles.map(({ file, publicUrl }) => ({
          fileUrl: publicUrl,
          fileType: determineType(file),
          fileSize: file.size,
          caption: caption || file.name,
          fileName: file.name,
        })),
      }),
    });

    if (!mediaRes.ok) {
      let errorMsg = "Помилка збереження в БД";
      try { errorMsg = (await mediaRes.json()).error || errorMsg; } catch {}
      toast(errorMsg, "error");
    }

    const hasArtifact = uploadedFiles.some(({ file }) => {
      const f = file;
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      return ["txt", "md", "json", "xml", "csv", "log", "py", "js", "ts", "html", "css", "pdf", "doc", "docx", "mp3", "wav", "ogg", "flac", "aac"].includes(ext) || f.type.startsWith("audio/");
    });

    setProgress(100);
    const dest = hasArtifact ? "/lore" : "/gallery";
    const msg = `${uploadedFiles.length} файл(ів) завантажено! Вони з'являться на сторінці через ~1 хвилину.`;
    setUploadSuccess(msg);
    setTimeout(() => router.push(dest), 4000);
    setUploading(false);
  };

  const handleApplyForKodlo = async () => {
    if (!applyMessage.trim()) return;
    setApplySending(true);

    try {
      const res = await fetch("/api/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: applyMessage }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error || "Не вдалося відправити заявку.", "error");
        setApplySending(false);
        return;
      }

      toast("Заявку відправлено! Чекай на розгляд.", "success");
      router.push("/");
    } catch {
      toast("Мережева помилка. Спробуй ще раз.", "error");
    }

    setApplySending(false);
  };

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
                <MarkdownEditor
                  value={postContent}
                  onChange={setPostContent}
                  rows={12}
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

        {/* Mobile warning */}
        {isMobile && (
          <div className="mb-6 p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
            <p className="text-yellow-400 text-sm font-bold mb-1 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              МОБІЛЬНИЙ ПРИСТРІЙ
            </p>
            <p className="text-yellow-400/80 text-xs">
              Завантаження файлів на телефоні працює нестабільно. Краще
              використовувати комп'ютер.
            </p>
          </div>
        )}

        {/* Upload success message */}
        {uploadSuccess && (
          <div className="mb-6 p-4 rounded-lg border border-green-500/50 bg-green-500/10">
            <p className="text-green-400 text-sm font-bold mb-1">ГОТОВО</p>
            <p className="text-green-400/80 text-xs">{uploadSuccess}</p>
          </div>
        )}

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
              <MarkdownEditor
                value={postContent}
                onChange={setPostContent}
                rows={12}
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
                multiple
                accept="image/*,video/*,.pdf,.txt,.md,.json,.xml,.csv,.py,.js,.ts,.html,.css,.mp3,.wav,.ogg,.flac,.aac"
                onChange={(e) => {
                  if (e.target.files) {
                    const availableSlots = MAX_FILES_PER_UPLOAD - files.length;
                    const validFiles = Array.from(e.target.files).filter((f) => f.size <= MAX_FILE_SIZE);
                    const newFiles = validFiles.slice(0, Math.max(availableSlots, 0));

                    if (validFiles.length < e.target.files.length) {
                      toast("Деякі файли перевищують 100 МБ і пропущені.", "error");
                    }
                    if (newFiles.length < validFiles.length) {
                      toast(`Максимум ${MAX_FILES_PER_UPLOAD} файлів за одне завантаження.`, "error");
                    }

                    setFiles((prev) => [...prev, ...newFiles]);
                    const firstImage = newFiles.find((f) => f.type.startsWith("image/"));
                    if (firstImage && !preview) {
                      const reader = new FileReader();
                      reader.onload = (event) => setPreview(event.target?.result as string);
                      reader.readAsDataURL(firstImage);
                    }
                  }
                }}
                className="hidden"
              />

              {files.length === 0 ? (
                <div>
                  <svg className="w-12 h-12 mx-auto text-ink-mute mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m6-6H6" />
                  </svg>
                  <p className="text-on-primary mb-2">НАЖМИ АБО ПЕРЕТЯГНИ ФАЙЛИ</p>
                  <p className="caption text-ink-mute">
                    Можна кілька файлів одразу. Максимум 100 МБ кожен.
                  </p>
                </div>
              ) : (
                <div onClick={(e) => e.stopPropagation()}>
                  {preview && (
                    <img src={preview} alt="Превʼю" className="max-h-32 mx-auto rounded-lg mb-4" />
                  )}
                  <div className="space-y-2 mb-4">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-canvas-night rounded-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-ink-mute shrink-0">
                            {f.type.startsWith("image/") ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            ) : f.type.startsWith("video/") ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                            ) : f.type.startsWith("audio/") ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            )}
                          </span>
                          <span className="text-sm text-on-primary truncate">{f.name}</span>
                          <span className="text-xs text-ink-mute shrink-0">{(f.size / 1024 / 1024).toFixed(1)} МБ</span>
                        </div>
                        <button onClick={() => removeFile(i)} className="text-ink-mute hover:text-red-400 text-xs shrink-0 ml-2">✕</button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-ink-mute">Натисни або перетягни ще файли</p>
                </div>
              )}
            </div>

            {/* Caption */}
            {files.length > 0 && (
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
                <div className="h-2 bg-canvas-night-soft rounded-full overflow-hidden">
                  <div
                    className="h-full bg-on-primary transition-all duration-200 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="micro-cap text-ink-mute mt-2 text-center">
                  ЗАВАНТАЖУЄМО... {progress}% ({files.length} файл(ів))
                </p>
              </div>
            )}

            {/* Upload button */}
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="btn-ghost text-on-primary disabled:opacity-30 mt-6"
            >
              {uploading ? "НАЖИМАЄМО..." : `ЗАВАНТАЖИТИ (${files.length})`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
