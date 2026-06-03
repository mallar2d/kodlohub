"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";

export default function CastNewClient() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
        router.push("/cast");
      }
    });
  }, [router, supabase]);

  useEffect(() => {
    supabase
      .from("podcast_episodes")
      .select("episode_number")
      .order("episode_number", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setEpisodeNumber(data.episode_number + 1);
      });
  }, [supabase]);

  const handleUpload = async () => {
    if (!title.trim() || !file) {
      toast("Введіть назву та оберіть аудіо-файл", "error");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const presignRes = await fetch("/api/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorId: "podcast",
          files: [{
            fileName: file.name,
            fileType: file.type || "audio/mpeg",
            fileSize: file.size,
          }],
        }),
      });

      if (!presignRes.ok) {
        const data = await presignRes.json();
        throw new Error(data.error || "Presign failed");
      }

      const { uploads } = await presignRes.json();
      const upload = uploads[0];
      if (!upload) throw new Error("No upload URL returned");

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed"));
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.open("PUT", upload.presignedUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      const audio = new Audio(upload.publicUrl);
      const duration = await new Promise<number>((resolve) => {
        audio.addEventListener("loadedmetadata", () => resolve(audio.duration));
        audio.addEventListener("error", () => resolve(0));
        setTimeout(() => resolve(0), 5000);
      });

      const createRes = await fetch("/api/podcast/episodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          audio_url: upload.publicUrl,
          duration: Math.round(duration),
          episode_number: episodeNumber,
        }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error || "Failed to create episode");
      }

      toast("Випуск створено!", "success");
      router.push("/cast");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Помилка", "error");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[600px] mx-auto">
        <p className="micro-cap text-ink-mute mb-2">КОДЛОКАСТ</p>
        <h1 className="heading-section mb-8">НОВИЙ ВИПУСК</h1>

        <div className="space-y-6">
          <div>
            <label className="micro-cap text-ink-mute mb-2 block">НОМЕР ВИПУСКУ</label>
            <input
              type="number"
              value={episodeNumber}
              onChange={(e) => setEpisodeNumber(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute"
            />
          </div>

          <div>
            <label className="micro-cap text-ink-mute mb-2 block">НАЗВА</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Назва випуску..."
              className="w-full px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute"
            />
          </div>

          <div>
            <label className="micro-cap text-ink-mute mb-2 block">ОПИС</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Про що цей випуск..."
              rows={4}
              className="w-full px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute resize-none"
            />
          </div>

          <div>
            <label className="micro-cap text-ink-mute mb-2 block">АУДІО-ФАЙЛ</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-8 border-2 border-dashed border-hairline-dark rounded-lg text-ink-mute hover:border-on-primary-mute hover:text-on-primary transition-colors text-center"
            >
              {file ? (
                <div>
                  <p className="text-on-primary text-sm">{file.name}</p>
                  <p className="text-xs text-ink-mute mt-1">{(file.size / 1024 / 1024).toFixed(1)} МБ</p>
                </div>
              ) : (
                <div>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
                    <path d="M9 18V5l12-2v13"/>
                    <circle cx="6" cy="18" r="3"/>
                    <circle cx="18" cy="16" r="3"/>
                  </svg>
                  <p className="text-sm">Натисни або перетягни аудіо-файл</p>
                  <p className="text-xs text-ink-mute mt-1">MP3, WAV, OGG, FLAC</p>
                </div>
              )}
            </button>
          </div>

          {uploading && (
            <div>
              <div className="h-2 bg-canvas-night-soft rounded-full overflow-hidden">
                <div
                  className="h-full bg-on-primary rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-ink-mute mt-1 text-center">{uploadProgress}%</p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleUpload}
              disabled={uploading || !title.trim() || !file}
              className="btn-ghost text-on-primary flex-1 disabled:opacity-30"
            >
              {uploading ? "ЗАВАНТАЖЕННЯ..." : "СТВОРИТИ ВИПУСК"}
            </button>
            <button
              onClick={() => router.push("/cast")}
              className="btn-ghost text-ink-mute"
            >
              СКАСУВАТИ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
